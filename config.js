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
if (typeof window.supabase !== 'undefined') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error('Supabase JS SDK not loaded!');
}
