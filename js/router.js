// js/router.js
// Router and View management

import { supabase } from './supabase-client.js';

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
        // Initialization is handled by app-init.js
    } else {
        navigateTo(user ? ROUTES.DASHBOARD : ROUTES.LOGIN);
    }
}

// Initial route check
window.addEventListener('popstate', handleRoute);
window.navigateTo = navigateTo;
