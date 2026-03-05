// js/auth-guard.js

(function () {
    const path = window.location.pathname;
    const publicPages = ['/login', '/signup', '/error', '/login.html', '/signup.html', '/error.html'];

    // Allow share pages to be public
    if (path.startsWith('/share/')) return;

    const token = sessionStorage.getItem('github_token');

    if (!publicPages.includes(path) && path !== '/dashboard' && path !== '/' && path !== '/index.html' && path !== '/dashboard.html') {
        // route-guard handles unknown paths.
    }

    if (!publicPages.includes(path)) {
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        // Note: Actual token expiry / invalidation (401 Unauthorized) 
        // is handled proactively by the GitHubAPI wrapper during network requests.
    } else {
        // If on login/signup but already logged in with a proxy token
        if (token) {
            // Check if we are physically on login and there isn't an oauth redirect code
            if (path.includes('login') || path.includes('signup')) {
                const params = new URLSearchParams(window.location.search);
                if (!params.has('code')) {
                    window.location.href = '/dashboard';
                }
            }
        }
    }
})();
