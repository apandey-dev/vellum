// js/auth-guard.js

(function () {
    const path = window.location.pathname;
    const publicPages = ['/login', '/signup', '/error', '/login.html', '/signup.html', '/error.html'];

    // Allow share pages to be public
    if (path.startsWith('/share/')) return;

    const user = sessionStorage.getItem('currentUser');
    const loginTime = sessionStorage.getItem('loginTime');

    if (!publicPages.includes(path) && path !== '/dashboard' && path !== '/' && path !== '/index.html' && path !== '/dashboard.html') {
        // Not a public page, but not explicitly the dashboard?
        // route-guard handles unknown paths.
    }

    if (!publicPages.includes(path)) {
        if (!user || !loginTime) {
            window.location.href = '/login.html';
            return;
        }

        // 2-hour session check
        const TWO_HOURS = 2 * 60 * 60 * 1000;
        if (Date.now() - parseInt(loginTime) > TWO_HOURS) {
            sessionStorage.clear();
            window.location.href = '/login.html';
            return;
        }
    } else {
        // If on login/signup but already logged in and session valid
        if (user && loginTime && (Date.now() - parseInt(loginTime) <= 2 * 60 * 60 * 1000)) {
            if (path === '/login' || path === '/signup' || path === '/login.html' || path === '/signup.html') {
                window.location.href = '/dashboard';
            }
        }
    }
})();
