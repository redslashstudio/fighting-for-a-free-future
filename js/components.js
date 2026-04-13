/* ============================================
   FIGHTING FOR A FREE FUTURE — Shared Components
   Single source of truth for nav, drawer & footer.
   Loaded synchronously before page content renders.
   ============================================ */

(function () {
    var root = document.documentElement;
    var base = root.getAttribute('data-base') || '';
    var page = root.getAttribute('data-page') || '';
    var isHome = page === 'home';

    // --- Nav items (top nav) ---
    var items = [
        { label: 'Instagram', href: 'social.html',      key: 'social' },
        { label: 'Topics',    href: 'topics/index.html', key: 'topics' },
        { label: 'Ask',       href: 'ask.html',         key: 'ask' },
        { label: 'Discussion', href: 'discussion.html', key: 'discussion' }
    ];

    // --- Footer-only items (all pages still linked from footer) ---
    var footerOnlyItems = [
        { label: 'Mission',  href: 'mission.html' },
        { label: 'Writers',  href: 'writers.html' },
        { label: 'Articles', href: 'articles.html' },
        { label: 'Podcast',  href: 'podcast.html' }
    ];

    // Build link href — prepend base path
    function href(item) {
        return base + item.href;
    }

    // Active state — match page key
    function isActive(item) {
        return item.key === page || (item.key === 'topics' && page.indexOf('topics') === 0);
    }

    // --- Desktop nav links ---
    var desktopLinks = '';
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var cls = '';
        if (isActive(item)) cls += ' class="active"';
        if (item.key === 'support') {
            cls = isActive(item) ? ' class="nav-cta active"' : ' class="nav-cta"';
        }
        desktopLinks += '<li><a href="' + href(item) + '"' + cls + '>' + item.label + '</a></li>';
    }

    // --- Drawer links ---
    var drawerLinks = '';
    for (var j = 0; j < items.length; j++) {
        var d = items[j];
        var dcls = '';
        if (isActive(d) && d.key === 'support') dcls = ' class="drawer-cta active"';
        else if (d.key === 'support') dcls = ' class="drawer-cta"';
        else if (isActive(d)) dcls = ' class="active"';
        drawerLinks += '<a href="' + href(d) + '"' + dcls + '>' + d.label + '</a>';
    }

    // --- Nav HTML ---
    var navClass = isHome ? 'site-nav' : 'site-nav scrolled';
    var navHTML =
        '<nav class="' + navClass + '">' +
            '<a href="' + base + 'index.html" class="nav-compact-title">FIGHTING FOR A FREE FUTURE</a>' +
            '<ul class="nav-links">' + desktopLinks + '</ul>' +
            '<button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">' +
                '<span></span><span></span><span></span>' +
            '</button>' +
        '</nav>' +
        '<div class="nav-drawer">' + drawerLinks + '</div>' +
        '<div class="nav-drawer-overlay"></div>';

    // --- Footer HTML ---
    var footerHTML =
        '<footer class="site-footer">' +
            '<div class="footer-inner">' +
                '<div class="footer-brand">' +
                    '<div class="footer-logo">FIGHTING FOR A FREE FUTURE</div>' +
                    '<div class="footer-purpose" data-live-date></div>' +
                '</div>' +
                '<div class="footer-links">' +
                    '<a href="' + base + 'mission.html">Mission</a>' +
                    '<a href="' + base + 'strategy.html">Strategy</a>' +
                    '<a href="' + base + 'coalition.html">Coalition</a>' +
                    '<a href="' + base + 'topics/index.html">Topics</a>' +
                    '<a href="' + base + 'ask.html">Ask</a>' +
                    '<a href="' + base + 'social.html">Instagram</a>' +
                    '<a href="' + base + 'writers.html">Writers</a>' +
                    '<a href="' + base + 'articles.html">Articles</a>' +
                    '<a href="' + base + 'podcast.html">Podcast</a>' +
                    '<a href="' + base + 'support.html">Support</a>' +
                '</div>' +
            '</div>' +
            '<div class="footer-bottom">' +
                '<span>&copy; 2026 Fighting for a Free Future. All rights reserved.</span>' +
                '<div class="footer-social">' +
                    '<a href="https://www.youtube.com/@FightingforaFreeFuture" target="_blank" rel="noopener">YouTube</a>' +
                    '<a href="https://voices.fightingforafreefuture.com" target="_blank" rel="noopener">Substack</a>' +
                    '<a href="#">X</a>' +
                '</div>' +
            '</div>' +
        '</footer>';

    // --- Inject nav (synchronous — runs before paint) ---
    var navRoot = document.getElementById('site-nav-root');
    if (navRoot) navRoot.innerHTML = navHTML;

    // --- Inject footer (at DOMContentLoaded — below fold, timing irrelevant) ---
    document.addEventListener('DOMContentLoaded', function () {
        var footerRoot = document.getElementById('site-footer-root');
        if (footerRoot) footerRoot.innerHTML = footerHTML;
    });
})();
