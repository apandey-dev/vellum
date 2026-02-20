(function() {
    let pathname = window.location.pathname;
    const search = window.location.search;

    // 1. Normalize trailing slashes (except root)
    if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
        window.location.replace(pathname + search);
        return;
    }

    // 2. Redirect .html and internal folders to clean URLs
    if (pathname.endsWith('.html') || pathname.includes('/auth/')) {
        let cleanPath = pathname.replace(/\.html$/, '');

        // Remove /auth/ prefix if present
        if (cleanPath.startsWith('/auth/')) {
            cleanPath = cleanPath.replace('/auth/', '/');
        }

        // Handle index specifically
        if (cleanPath === '/index') {
            cleanPath = '/';
        }

        window.location.replace((cleanPath || '/') + search);
        return;
    }

    // 3. Handle /share.html?id=... or /share?id=... -> /share/...
    if (pathname === '/share.html' || pathname === '/share') {
        const params = new URLSearchParams(search);
        const id = params.get('id');
        if (id) {
            window.location.replace('/share/' + id);
            return;
        }
    }

    // 4. Allowed routes validation (Clean URLs only)
    const allowedRoutes = [
        '/',
        '/dashboard',
        '/login',
        '/signup',
        '/print',
        '/error'
    ];

    const isShareRoute = pathname.startsWith('/share/');
    const isAllowed = allowedRoutes.includes(pathname) || isShareRoute;

    if (!isAllowed) {
        // Prevent infinite loop on error page
        if (pathname !== '/error') {
            window.location.replace('/error');
        }
    }
})();
