(function() {
    const path = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash;

    // 1. Redirect .html to clean version
    if (path.endsWith('.html')) {
        let clean = path.replace('.html', '');

        // Map internal paths to public clean paths
        if (clean === '/auth/login') clean = '/login';
        if (clean === '/auth/signup') clean = '/signup';
        if (clean === '/index') clean = '/dashboard';

        // Handle root index
        if (clean === '/') clean = '/dashboard';

        window.location.replace(clean + search + hash);
        return;
    }

    // 2. Prevent direct access to "dirty" clean paths (internal structure)
    // These are paths that cleanUrls:true would allow but we want to hide.
    const dirtyPaths = ['/auth/login', '/auth/signup', '/share', '/index'];
    if (dirtyPaths.includes(path)) {
        window.location.replace('/error');
        return;
    }
})();
