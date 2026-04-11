import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load search index once at module scope (survives warm invocations)
const searchIndex = JSON.parse(readFileSync(join(__dirname, 'search-index.json'), 'utf-8'));

const client = new Anthropic();

const SYSTEM_PROMPT = `You are the Fighting for a Free Future archive assistant. Your job is to answer questions about the positions, arguments, and ideas published by Steve Baker and the FFF contributors, drawing ONLY from the source material provided below.

RULES:
1. ONLY state positions that are directly supported by the provided sources. If the sources don't cover a topic, say so honestly — suggest the reader explore the topic pages or Substack archive.
2. Never invent quotes. You may paraphrase arguments from the sources.
3. When you reference a specific claim or position, cite it inline like this: [Source: Article Title]. The UI will convert these to clickable links.
4. Write in a clear, direct editorial voice. Match the tone of a sharp political briefing — not robotic, not casual.
5. Keep answers concise — 2-4 paragraphs for most questions. The reader wants the argument, not an essay.
6. If multiple contributors have different perspectives on a topic, acknowledge that rather than flattening it into one view.
7. Steve Baker is "Steve Baker" — no honorifics, no "Mr Baker", no "the Rt Hon".
8. End with a "Sources" section listing the articles you drew from, formatted as:
   - **Article Title** by Author Name

CONTEXT: Fighting for a Free Future is a political media operation led by Steve Baker. It publishes on Substack under the masthead "Voices for a Free Future" and produces a podcast called "The Insurgency". The editorial position is broadly free-market, libertarian-leaning, and focused on civil liberties, sound money, and limited government.`;

// --- Stop words (filtered from query before keyword scoring) ---
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
    'into', 'about', 'between', 'through', 'during', 'before', 'after',
    'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under',
    'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either',
    'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than',
    'too', 'very', 'just', 'because', 'if', 'when', 'where', 'how',
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
    'it', 'its', 'he', 'she', 'they', 'them', 'we', 'you', 'me',
    'him', 'her', 'us', 'my', 'your', 'his', 'our', 'their',
    'think', 'thinks', 'thought', 'thoughts', 'tell', 'say', 'says',
    'said', 'know', 'like', 'get', 'make', 'go', 'see', 'come',
    'take', 'want', 'give', 'use', 'find', 'here', 'there', 'then',
    'now', 'also', 'well', 'much', 'even', 'back', 'way', 'long',
    'does', 'fff', 'steve', 'baker', 'position', 'view', 'views',
    'written', 'write', 'article', 'articles', 'archive'
]);

// --- Retrieval ---

function matchQueryToTopics(query) {
    const q = query.toLowerCase();
    const matched = [];

    for (const topic of searchIndex.topicPatterns) {
        let score = 0;

        // Check keyword patterns
        for (const pattern of topic.keywords) {
            if (q.includes(pattern.toLowerCase())) {
                score += 3;
            }
        }

        // Check primary tags
        for (const tag of topic.primaryTags) {
            if (q.includes(tag.toLowerCase())) {
                score += 2;
            }
        }

        // Check secondary tags
        for (const tag of topic.secondaryTags) {
            if (q.includes(tag.toLowerCase())) {
                score += 1;
            }
        }

        // Check topic display name
        if (q.includes(topic.name.toLowerCase())) {
            score += 4;
        }

        if (score > 0) {
            matched.push({ topicId: topic.id, topicName: topic.name, score });
        }
    }

    return matched.sort((a, b) => b.score - a.score);
}

function scorePost(post, query, matchedTopics) {
    const q = query.toLowerCase();
    const queryTerms = q.split(/\s+/).filter(t => t.length > 1 && !STOP_WORDS.has(t));
    let score = 0;

    // 1. Topic match (0-10): boost posts assigned to matched topics
    for (const mt of matchedTopics) {
        const postTopic = post.topics.find(t => t.id === mt.topicId);
        if (postTopic) {
            score += Math.min(postTopic.score, 10);
        }
    }

    // 2. Keyword match in title + subtitle + text + keywords (0-8)
    const searchable = `${post.title} ${post.subtitle} ${post.text} ${post.keywords || ''}`.toLowerCase();
    let keywordHits = 0;
    for (const term of queryTerms) {
        if (searchable.includes(term)) keywordHits++;
    }
    score += Math.min((keywordHits / Math.max(queryTerms.length, 1)) * 8, 8);

    // Title match bonus (stronger — title relevance is high signal)
    const titleLower = post.title.toLowerCase();
    for (const term of queryTerms) {
        if (titleLower.includes(term)) score += 2;
    }

    // 3. Author match (0-3)
    const knownAuthors = ['baker', 'richer', 'shearer', 'terling', 'amankona', 'lugg', 'abbott'];
    for (const author of knownAuthors) {
        if (q.includes(author) && post.author.toLowerCase().includes(author)) {
            score += 3;
        }
    }

    // 4. Recency bonus (0-2)
    if (post.date) {
        const age = Date.now() - new Date(post.date).getTime();
        const daysOld = age / (1000 * 60 * 60 * 24);
        if (daysOld < 90) score += 2;
        else if (daysOld < 180) score += 1;
        else if (daysOld < 365) score += 0.5;
    }

    // Slight penalty for very short posts (podcast intros etc.)
    if (post.wordcount < 200) score *= 0.5;

    return score;
}

function retrievePosts(query, limit = 8) {
    const matchedTopics = matchQueryToTopics(query);

    const scored = searchIndex.posts.map(post => ({
        ...post,
        retrievalScore: scorePost(post, query, matchedTopics)
    }));

    scored.sort((a, b) => b.retrievalScore - a.retrievalScore);

    // Always return top results — let Claude decide if they're relevant
    const top = scored.slice(0, limit).filter(p => p.retrievalScore > 0.5);
    return {
        posts: top.length > 0 ? top : scored.slice(0, 3),
        matchedTopics: matchedTopics.slice(0, 3)
    };
}

// --- Prompt building ---

function buildSourcesBlock(posts, matchedTopics) {
    let block = '';

    // Include topic positions for matched topics
    for (const mt of matchedTopics) {
        const position = searchIndex.positions[mt.topicId];
        if (position) {
            block += `\n=== TOPIC POSITION: ${mt.topicName} ===\n${position}\n`;
        }
    }

    block += '\n=== RETRIEVED ARTICLES ===\n';

    for (const post of posts) {
        block += `\n---\nTitle: ${post.title}\nAuthor: ${post.author}\nDate: ${post.date?.split('T')[0] || 'Unknown'}\nURL: ${post.url}\nTopics: ${post.topics.map(t => t.id).join(', ')}\n\n${post.text}\n---\n`;
    }

    return block;
}

// --- Handler ---

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { question, history } = req.body || {};

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return res.status(400).json({ error: 'Question is required' });
    }

    if (question.length > 500) {
        return res.status(400).json({ error: 'Question too long (max 500 characters)' });
    }

    // Validate history — array of { role, content } pairs, max 10 turns
    const conversationHistory = Array.isArray(history)
        ? history.slice(-10).filter(m => m.role && m.content && typeof m.content === 'string')
        : [];

    try {
        const { posts, matchedTopics } = retrievePosts(question.trim());

        if (posts.length === 0) {
            return res.status(200).json({
                answer: "The FFF archive doesn't appear to have enough material to answer that question well. Try browsing the [topic pages](/topics/) or searching the [Substack archive](https://voices.fightingforafreefuture.com/) directly.",
                sources: [],
                topicsMatched: []
            });
        }

        const sourcesBlock = buildSourcesBlock(posts, matchedTopics);

        // Build messages array with conversation history
        const messages = [
            ...conversationHistory.map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
            })),
            { role: 'user', content: question.trim() }
        ];

        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: SYSTEM_PROMPT + '\n\nSOURCE MATERIAL:\n' + sourcesBlock,
            messages
        });

        const answer = message.content[0]?.text || 'Unable to generate an answer.';

        const sources = posts.map(p => ({
            title: p.title,
            url: p.url,
            author: p.author,
            date: p.date?.split('T')[0] || null,
            score: Math.round(p.retrievalScore * 10) / 10
        }));

        return res.status(200).json({
            answer,
            sources,
            topicsMatched: matchedTopics.map(t => t.topicId)
        });

    } catch (err) {
        console.error('Ask API error:', err);
        return res.status(500).json({
            error: 'Something went wrong. Please try again.',
            detail: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
}
