// js/auth-guard.js

(function() {
    const path = window.location.pathname;
    const publicPages = ['/login', '/signup', '/error'];

    // Allow share pages to be public
    if (path.startsWith('/share/')) return;

    const user = localStorage.getItem('vellum_user');
    const loginTime = sessionStorage.getItem('vellum_login_time');

    if (!publicPages.includes(path) && path !== '/dashboard' && path !== '/') {
         // Not a public page, but not explicitly the dashboard?
         // route-guard handles unknown paths.
    }

    if (!publicPages.includes(path)) {
        if (!user || !loginTime) {
            window.location.href = '/login';
            return;
        }

        // 2-hour session check
        if (Date.now() - parseInt(loginTime) > 7200000) {
            sessionStorage.clear();
            localStorage.removeItem('vellum_user');
            window.location.href = '/login';
            return;
        }
    } else {
        // If on login/signup but already logged in and session valid
        if (user && loginTime && (Date.now() - parseInt(loginTime) < 7200000)) {
            if (path === '/login' || path === '/signup') {
                window.location.href = '/dashboard';
            }
        }
    }
})();
