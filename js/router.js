// js/router.js
// Router and View management

import { supabase } from './supabase-client.js';
import { checkAuthAndProfile } from './auth.js';

export const VIEWS = {
    DASHBOARD: 'view-dashboard',
    LOGIN: 'view-login',
    SIGNUP: 'view-signup',
    PUBLIC: 'view-public',
    LOADING: 'view-loading'
};

export const ROUTES = {
    LOGIN: '/login',
    SIGNUP: '/signup',
    DASHBOARD: '/dashboard',
    ROOT: '/',
    PUBLIC: '/public/'
};

export function navigateTo(path) {
    window.history.pushState({}, '', path);
    handleRoute();
}

export function showView(viewId) {
    document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(viewId);
    if (target) target.classList.remove('hidden');
}

export async function handleRoute() {
    const path = window.location.pathname;
    showView(VIEWS.LOADING);

    if (path.startsWith(ROUTES.PUBLIC)) {
        const noteId = path.split('/').pop();
        if (noteId) {
            // Public note logic...
            return;
        }
    }

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (user && (path === ROUTES.LOGIN || path === ROUTES.SIGNUP)) {
        navigateTo(ROUTES.DASHBOARD);
        return;
    }

    if (!user && (path === ROUTES.DASHBOARD || path === ROUTES.ROOT)) {
        navigateTo(ROUTES.LOGIN);
        return;
    }

    if (path === ROUTES.LOGIN) {
        showView(VIEWS.LOGIN);
    } else if (path === ROUTES.SIGNUP) {
        showView(VIEWS.SIGNUP);
    } else if (path === ROUTES.DASHBOARD || path === ROUTES.ROOT) {
        showView(VIEWS.DASHBOARD);
        // Trigger dashboard initialization if authenticated
        const authStatus = await checkAuthAndProfile();
        if (authStatus.authenticated) {
            const { initDashboard } = await import('./app-init.js');
            initDashboard(authStatus.user, authStatus.profile, authStatus.approved);
        }
    } else {
        navigateTo(user ? ROUTES.DASHBOARD : ROUTES.LOGIN);
    }
}

// --- AUTH HANDLERS ---

export async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorMsg = document.getElementById('login-error');

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Check Profile Status
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('status')
            .eq('id', data.user.id)
            .single();

        if (!profile || profile.status !== 'approved') {
            // We still navigate to dashboard, but dashboard init will show pending UI
        }

        navigateTo(ROUTES.DASHBOARD);

    } catch (err) {
        if (errorMsg) {
            errorMsg.textContent = err.message;
            errorMsg.style.display = 'block';
        }
    }
}

export async function handleSignup(e) {
    e.preventDefault();
    const fullName = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const errorMsg = document.getElementById('signup-error');
    const successMsg = document.getElementById('signup-success');

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName },
                emailRedirectTo: `${window.location.origin}/auth/confirm.html`
            }
        });

        if (error) throw error;

        if (successMsg) {
            successMsg.textContent = "Account created! Please check your email for confirmation.";
            successMsg.style.display = 'block';
        }
        document.getElementById('signup-form').reset();

    } catch (err) {
        if (errorMsg) {
            errorMsg.textContent = err.message;
            errorMsg.style.display = 'block';
        }
    }
}

// Initial route check
window.addEventListener('popstate', handleRoute);
window.navigateTo = navigateTo;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
