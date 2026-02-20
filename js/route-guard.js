(function () {
    let path = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash;

    // Normalize trailing slash (e.g. /dashboard/ -> /dashboard)
    if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
    }

    // 1️⃣ Map internal/direct paths to correct public routes
    const internalPaths = {
        '/auth/login.html': '/login',
        '/auth/signup.html': '/signup',
        '/auth/login': '/login',
        '/auth/signup': '/signup',
        '/index.html': '/',
        '/index': '/',
        '/share.html': '/error',
        '/share': '/error',
        '/print.html': '/print',
        '/error.html': '/error',
        '/dashboard.html': '/dashboard'
    };

    if (internalPaths[path]) {
        window.location.replace(internalPaths[path] + search + hash);
        return;
    }

    // Handle any other lingering .html extensions gracefully
    if (path.endsWith('.html')) {
        let clean = path.replace('.html', '');
        window.location.replace(clean + search + hash);
        return;
    }

    // 2️⃣ Allowed public routes
    const allowedRoutes = [
        '/',
        '/dashboard',
        '/login',
        '/signup',
        '/print',
        '/error'
    ];

    // Allow dynamic share routes like /share/abc123
    if (path.startsWith('/share/')) return;

    // Allow explicitly defined routes
    if (allowedRoutes.includes(path)) return;

    // 3️⃣ Everything else → error
    if (path !== '/error') {
        window.location.replace('/error');
    }
})();