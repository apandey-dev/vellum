// ========================================
// mindJournal - CONFIGURATION
// ========================================

// REPLACE THESE WITH YOUR PROJECT CREDENTIALS
// 1. Go to https://supabase.com/dashboard/project/_/settings/api
// 2. Copy the "Project URL" and "anon" public key
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase Client
// Ensure the Supabase JS library is loaded before this script runs
window.initSupabase = function() {
    const supabaseProvider = window.supabase || window.Supabase;
    if (supabaseProvider && supabaseProvider.createClient) {
        if (!window.supabaseClient) {
            window.supabaseClient = supabaseProvider.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log('Supabase Client Initialized via initSupabase');
        }
        return window.supabaseClient;
    }
    return null;
};

// Try immediate init
window.initSupabase();
