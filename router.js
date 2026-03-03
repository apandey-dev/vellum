// ========================================
// mindJournal - ROUTER & SPA LOGIC
// ========================================

(function() {

// Ensure we use the initialized client, not the global library
// const supabase = window.supabaseClient; // Removed to avoid static undefined error
function getSupabase() {
    if (window.supabaseClient) return window.supabaseClient;
    if (window.initSupabase) return window.initSupabase();
    return null;
}

const appState = {
    currentView: null,
    publicNoteId: null,
    initialized: false
};

// --- VIEWS ---
const VIEWS = {
    DASHBOARD: 'view-dashboard',
    LOGIN: 'view-login',
    SIGNUP: 'view-signup',
    PUBLIC: 'view-public',
    LOADING: 'view-loading'
};

// --- ROUTES ---
const ROUTES = {
    LOGIN: '/login',
    SIGNUP: '/signup',
    DASHBOARD: '/dashboard',
    ROOT: '/',
    PUBLIC: '/public/'
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Route Check
    handleRoute();

    // 2. Browser History Handling
    window.addEventListener('popstate', handleRoute);

    // 3. Intercept Link Clicks for SPA Navigation
    document.body.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && e.target.href.startsWith(window.location.origin)) {
            e.preventDefault();
            navigateTo(e.target.pathname);
        }
    });

    // 4. Session Persistence Handler
    const sb = getSupabase();
    if (sb) {
        sb.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                // If on protected route, force redirect to login
                const path = window.location.pathname;
                if (path === ROUTES.DASHBOARD || path === ROUTES.ROOT) {
                    navigateTo(ROUTES.LOGIN);
                }
            }
        });
    }
});

// --- NAVIGATION ---
window.navigateTo = function(path) {
    window.history.pushState({}, '', path);
    handleRoute();
};

function navigateTo(path) {
    window.navigateTo(path);
}

// --- ROUTE HANDLER ---
async function handleRoute() {
    const path = window.location.pathname;

    // Show Loading
    showView(VIEWS.LOADING);

    // --- PUBLIC NOTE ROUTE ---
    if (path.startsWith(ROUTES.PUBLIC)) {
        const noteId = path.split('/').pop();
        if (noteId) {
            appState.publicNoteId = noteId;
            await loadPublicNote(noteId);
            return;
        }
    }

    // --- AUTH CHECK ---
    let user = null;
    try {
        const sb = getSupabase();
        if (sb) {
            const { data } = await sb.auth.getSession();
            user = data?.session?.user;
        }
    } catch (e) {
        console.warn('Auth check failed (likely config issues), defaulting to unauthenticated.');
    }

    // --- REDIRECT LOGIC ---

    // 1. Authenticated User accessing Login/Signup -> Redirect to Dashboard
    if (user && (path === ROUTES.LOGIN || path === ROUTES.SIGNUP)) {
        navigateTo(ROUTES.DASHBOARD);
        return;
    }

    // 2. Unauthenticated User accessing Protected Routes -> Redirect to Login
    if (!user && (path === ROUTES.DASHBOARD || path === ROUTES.ROOT)) {
        navigateTo(ROUTES.LOGIN);
        return;
    }

    // --- RENDER VIEW ---
    if (path === ROUTES.LOGIN) {
        showView(VIEWS.LOGIN);
        updateMeta('Login - MindJournal', 'Log in to your account.');
    } else if (path === ROUTES.SIGNUP) {
        showView(VIEWS.SIGNUP);
        updateMeta('Sign Up - MindJournal', 'Create a new account.');
    } else if (path === ROUTES.DASHBOARD || path === ROUTES.ROOT) {
        // Init Dashboard Logic if first time
        // IMPORTANT: Only run after auth check is passed (which is guaranteed here by redirects above)

        // Final Profile Check (Double security) - REMOVED STATUS CHECK
        // Auto-activation means status is always assumed active or ignored for access.
        // We keep profile existence check if needed, but for now we skip status check.

        if (!appState.initialized) {
            if (window.initDashboard) window.initDashboard();
            appState.initialized = true;
        }
        showView(VIEWS.DASHBOARD);
        updateMeta('Dashboard - MindJournal', 'Manage your notes.');
    } else {
        // 404 - Fallback to Dashboard or Login
        if (user) navigateTo(ROUTES.DASHBOARD);
        else navigateTo(ROUTES.LOGIN);
    }
}

// --- VIEW CONTROLLER ---
function showView(viewId) {
    // Hide all views
    document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden'));

    // Show target view
    const target = document.getElementById(viewId);
    if (target) target.classList.remove('hidden');

    appState.currentView = viewId;
}

// --- PUBLIC NOTE LOGIC ---
async function loadPublicNote(noteId) {
    try {
        const sb = getSupabase();
        if (!sb) throw new Error("Supabase not initialized");

        const { data: note, error } = await sb
            .from('notes')
            .select('title, content, is_public, public_expires_at')
            .eq('id', noteId)
            .single();

        if (error || !note) {
            showErrorInPublicView('Note not found.');
            return;
        }

        // Validate Access
        if (!note.is_public) {
            showErrorInPublicView('This note is private.');
            return;
        }

        if (note.public_expires_at && new Date(note.public_expires_at) < new Date()) {
            showErrorInPublicView('This link has expired.');
            return;
        }

        // Render Public View
        const titleEl = document.getElementById('public-note-title');
        const contentEl = document.getElementById('public-note-content');

        if (titleEl) titleEl.textContent = note.title;
        if (contentEl) contentEl.innerHTML = note.content;

        showView(VIEWS.PUBLIC);

        // SEO Update for Public Note
        updateMeta(note.title, note.content.substring(0, 150).replace(/<[^>]*>/g, ''), 'article');

    } catch (err) {
        console.error(err);
        showErrorInPublicView('Error loading note.');
    }
}

function showErrorInPublicView(msg) {
    const el = document.getElementById('public-note-content');
    if (el) el.innerHTML = `<div class="error-msg">${msg}</div>`;
    showView(VIEWS.PUBLIC);
    updateMeta('Error - MindJournal', 'Content unavailable.');
}

// --- SEO MANAGER ---
function updateMeta(title, description, type = 'website') {
    document.title = title;

    // Helper to set meta content
    const setMeta = (name, content) => {
        let el = document.querySelector(`meta[name="${name}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.name = name;
            document.head.appendChild(el);
        }
        el.content = content;
    };

    // Helper to set OG property
    const setOg = (property, content) => {
        let el = document.querySelector(`meta[property="${property}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute('property', property);
            document.head.appendChild(el);
        }
        el.content = content;
    };

    setMeta('description', description);
    setOg('og:title', title);
    setOg('og:description', description);
    setOg('og:type', type);
    setOg('og:url', window.location.href);

    // Twitter
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
}

// --- AUTH HANDLERS (Migrated from login/signup.html) ---

// Login Form Handler
window.handleLogin = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorMsg = document.getElementById('login-error');

    try {
        const sb = getSupabase();
        if (!sb) throw new Error("Supabase not initialized. Check connection.");

        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Auto-Activation: Direct Redirect
        navigateTo(ROUTES.DASHBOARD);

    } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.style.display = 'block';
    }
};

// Signup Form Handler
window.handleSignup = async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const errorMsg = document.getElementById('signup-error');
    const successMsg = document.getElementById('signup-success');

    try {
        const sb = getSupabase();
        if (!sb) throw new Error("Supabase not initialized. Check connection.");

        const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });

        if (error) throw error;

        successMsg.textContent = "Account created! Logging in...";
        successMsg.style.display = 'block';
        document.getElementById('signup-form').reset();

        // Auto Login/Redirect if Supabase auto-signs in (default behavior)
        // If email confirm is ON, they need to check email.
        // If email confirm is OFF, they are logged in.
        const { data: sessionData } = await getSupabase().auth.getSession();
        if (sessionData?.session) {
             navigateTo(ROUTES.DASHBOARD);
        } else {
             successMsg.textContent = "Account created! Please confirm your email.";
        }

    } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.style.display = 'block';
    }
};

})();
