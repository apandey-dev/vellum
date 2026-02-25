/**
 * js/auth-guard.js
 * Enforces authentication and session timeout.
 */
(function() {
    const path = window.location.pathname;
    const publicPages = ['/login', '/signup', '/error'];

    // Allow share pages to be public
    if (path.startsWith('/share/')) return;

    const sessionStr = sessionStorage.getItem('vellum_session');
    const loginTime = sessionStorage.getItem('vellum_login_time');

    if (!publicPages.includes(path)) {
        // Protected page
        if (!sessionStr || !loginTime) {
            window.location.href = '/login';
            return;
        }

        // 2-hour session check (7200000 ms)
        if (Date.now() - parseInt(loginTime) > 7200000) {
            sessionStorage.clear();
            window.location.href = '/login';
            return;
        }
    } else {
        // Public page (login/signup)
        // If already logged in and session valid, redirect to dashboard
        if (sessionStr && loginTime && (Date.now() - parseInt(loginTime) < 7200000)) {
            if (path === '/login' || path === '/signup') {
                window.location.href = '/dashboard';
            }
        }
    }
})();
