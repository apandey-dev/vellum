/**
 * js/route-guard.js
 */
(function () {
    let path = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash;

    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

    const internalPaths = {
        '/auth/login.html': '/login',
        '/auth/signup.html': '/signup',
        '/auth/login': '/login',
        '/auth/signup': '/signup',
        '/index.html': '/',
        '/index': '/',
        '/share.html': '/error',
        '/print.html': '/print',
        '/error.html': '/error',
        '/dashboard.html': '/dashboard'
    };

    if (internalPaths[path]) {
        window.location.replace(internalPaths[path] + search + hash);
        return;
    }

    if (path.endsWith('.html')) {
        window.location.replace(path.replace('.html', '') + search + hash);
        return;
    }

    const allowedRoutes = ['/', '/dashboard', '/login', '/signup', '/print', '/error'];
    if (path.startsWith('/share/')) return;
    if (allowedRoutes.includes(path)) return;

    if (path !== '/error') window.location.replace('/error');
})();
