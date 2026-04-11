/**
 * Ask the Archive — Chat UI logic
 */

const messagesEl = document.getElementById('ask-messages');
const suggestionsEl = document.getElementById('ask-suggestions');
const inputEl = document.getElementById('ask-input');
const submitEl = document.getElementById('ask-submit');
const formEl = document.getElementById('ask-form');

let isLoading = false;

const SUGGESTED_QUESTIONS = [
    "What does Steve Baker think about the Bank of England?",
    "What is FFF's position on digital ID and surveillance?",
    "What has been written about free trade and tariffs?",
    "Why does FFF care about sound money?",
    "What does the archive say about free speech in the UK?"
];

// --- Init ---

function init() {
    renderSuggestions();
    formEl.addEventListener('submit', handleSubmit);
    inputEl.focus();
}

function renderSuggestions() {
    suggestionsEl.innerHTML = SUGGESTED_QUESTIONS.map(q =>
        `<button class="ask-suggestion" type="button">${q}</button>`
    ).join('');

    suggestionsEl.querySelectorAll('.ask-suggestion').forEach(btn => {
        btn.addEventListener('click', () => {
            inputEl.value = btn.textContent;
            handleSubmit(new Event('submit'));
        });
    });
}


// --- Submit ---

async function handleSubmit(e) {
    e.preventDefault();
    const question = inputEl.value.trim();
    if (!question || isLoading) return;

    // Hide suggestions after first question
    suggestionsEl.style.display = 'none';

    // Add question to chat
    addMessage(question, 'question');
    inputEl.value = '';
    inputEl.focus();

    // Show loading
    isLoading = true;
    submitEl.disabled = true;
    const loadingEl = addLoading();

    try {
        const res = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        });

        const data = await res.json();

        // Remove loading
        loadingEl.remove();

        if (!res.ok) {
            addError(data.error || 'Something went wrong. Please try again.');
            return;
        }

        addAnswer(data.answer, data.sources);

    } catch (err) {
        loadingEl.remove();
        addError('Unable to reach the archive. Check your connection and try again.');
    } finally {
        isLoading = false;
        submitEl.disabled = false;
    }
}


// --- Rendering ---

function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = `ask-message ask-message-${type}`;
    div.innerHTML = `<div class="ask-bubble">${escapeHtml(text)}</div>`;
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
}

function addAnswer(answerText, sources) {
    const div = document.createElement('div');
    div.className = 'ask-message ask-message-answer';

    // Convert markdown-style formatting to HTML
    let html = formatAnswer(answerText, sources);

    let sourcesHtml = '';
    if (sources && sources.length > 0) {
        const sourceItems = sources
            .filter(s => s.score > 2)
            .slice(0, 5)
            .map(s => {
                const date = s.date ? ` · ${formatDate(s.date)}` : '';
                return `<div class="ask-source-item">
                    <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.title)}</a>
                    <span class="ask-source-meta">${escapeHtml(s.author)}${date}</span>
                </div>`;
            }).join('');

        sourcesHtml = `<div class="ask-sources">
            <div class="ask-sources-label">Sources</div>
            ${sourceItems}
        </div>`;
    }

    div.innerHTML = `<div class="ask-bubble">${html}${sourcesHtml}</div>`;
    messagesEl.appendChild(div);
    scrollToBottom();
}

function addLoading() {
    const div = document.createElement('div');
    div.className = 'ask-message ask-loading';
    div.innerHTML = `
        <div class="ask-loading-dots">
            <div class="ask-loading-dot"></div>
            <div class="ask-loading-dot"></div>
            <div class="ask-loading-dot"></div>
        </div>
        <span>Searching the archive…</span>
    `;
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
}

function addError(text) {
    const div = document.createElement('div');
    div.className = 'ask-message';
    div.innerHTML = `<div class="ask-error">${escapeHtml(text)}</div>`;
    messagesEl.appendChild(div);
    scrollToBottom();
}


// --- Formatting ---

function formatAnswer(text, sources) {
    // Build a lookup of source titles to URLs
    const sourceLookup = {};
    if (sources) {
        for (const s of sources) {
            sourceLookup[s.title] = s.url;
        }
    }

    // Convert [Source: Title] citations to links
    let html = text.replace(/\[Source:\s*(.+?)\]/g, (match, title) => {
        const url = sourceLookup[title.trim()];
        if (url) {
            return `<a class="ask-citation" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(title.trim())}</a>`;
        }
        // Fuzzy match — try partial title match
        for (const [fullTitle, fullUrl] of Object.entries(sourceLookup)) {
            if (fullTitle.toLowerCase().includes(title.trim().toLowerCase()) ||
                title.trim().toLowerCase().includes(fullTitle.toLowerCase())) {
                return `<a class="ask-citation" href="${escapeHtml(fullUrl)}" target="_blank" rel="noopener">${escapeHtml(title.trim())}</a>`;
            }
        }
        return `<em>${escapeHtml(title.trim())}</em>`;
    });

    // Convert **bold** to <strong>
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Split into paragraphs
    html = html.split(/\n\n+/).map(p => {
        p = p.trim();
        if (!p) return '';
        // Check if this is a sources list (starts with "- **")
        if (p.startsWith('- **') || p.startsWith('- ')) {
            return ''; // Skip — we render our own sources section
        }
        if (p.startsWith('Sources') || p.startsWith('**Sources')) {
            return ''; // Skip the sources header
        }
        return `<p>${p}</p>`;
    }).filter(Boolean).join('');

    return html;
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function scrollToBottom() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}


// --- Start ---
init();
