/* ============================================
   FIGHTING FOR A FREE FUTURE — Shared JS
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {

    // --- Live date ---
    var now = new Date();
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var dateStr = now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
    document.querySelectorAll('[data-live-date]').forEach(function(el) {
        el.textContent = dateStr;
    });

    // --- Scroll reveal ---
    var reveals = document.querySelectorAll('.reveal');

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
    });

    reveals.forEach(function(el) {
        observer.observe(el);
    });

    // --- Compact title on scroll (homepage only) ---
    var masthead = document.querySelector('.site-masthead');
    var nav = document.querySelector('.site-nav');

    if (masthead && nav) {
        var mastheadObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    nav.classList.remove('scrolled');
                } else {
                    nav.classList.add('scrolled');
                }
            });
        }, {
            threshold: 0,
            rootMargin: '0px'
        });

        mastheadObserver.observe(masthead);
    }

    // --- Prevent placeholder form submission ---
    document.querySelectorAll('.cta-form, .signup-form').forEach(function(form) {
        form.addEventListener('submit', function(e) { e.preventDefault(); });
    });

    // --- Mobile nav drawer ---
    var toggle = document.querySelector('.nav-toggle');
    var drawer = document.querySelector('.nav-drawer');
    var overlay = document.querySelector('.nav-drawer-overlay');

    if (toggle && drawer && overlay) {
        toggle.addEventListener('click', function() {
            var open = drawer.classList.toggle('open');
            toggle.classList.toggle('active', open);
            toggle.setAttribute('aria-expanded', open);
            overlay.classList.toggle('open', open);
        });

        function closeDrawer() {
            drawer.classList.remove('open');
            overlay.classList.remove('open');
            toggle.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
        }

        drawer.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', closeDrawer);
        });

        overlay.addEventListener('click', closeDrawer);
    }
});
