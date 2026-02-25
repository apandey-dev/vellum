/**
 * js/auth-guard.js
 * Enforces authentication and session timeout (localStorage version).
 */
(function() {
    const path = window.location.pathname;
    const search = window.location.search;
    const publicPages = ['/login', '/signup', '/error'];

    // Allow share links to be public
    if (search.includes('share=')) return;

    const sessionStr = sessionStorage.getItem('vellum_session');

    if (!publicPages.includes(path)) {
        // Protected page
        if (!sessionStr) {
            window.location.href = '/login';
            return;
        }

        const session = JSON.parse(sessionStr);
        // 2-hour session check
        if (Date.now() > session.expiresAt) {
            sessionStorage.removeItem('vellum_session');
            window.location.href = '/login';
            return;
        }
    } else {
        // Public page (login/signup)
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            if (Date.now() < session.expiresAt) {
                if (path === '/login' || path === '/signup') {
                    window.location.href = '/dashboard';
                }
            }
        }
    }
})();
