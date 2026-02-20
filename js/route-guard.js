(function () {
    const path = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash;

    // 1️⃣ Clean direct .html access
    if (path.endsWith('.html')) {
        let clean = path.replace('.html', '');

        // Map internal file paths to public routes
        if (clean === '/auth/login') clean = '/login';
        if (clean === '/auth/signup') clean = '/signup';
        if (clean === '/index') clean = '/';
        if (clean === '/share') clean = '/error';

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
    window.location.replace('/error');
})();