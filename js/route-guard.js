if (window.location.pathname.endsWith('.html')) {
    let clean = window.location.pathname.replace('.html', '');

    // Normalize clean routes
    if (clean.includes('/auth/')) {
        clean = clean.replace('/auth/', '/');
    }
    if (clean === '/index') {
        clean = '/';
    }

    window.location.replace(clean || '/');
}
