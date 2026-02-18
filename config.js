// ========================================
// mindJournal - CONFIGURATION
// ========================================

// REPLACE THESE WITH YOUR PROJECT CREDENTIALS
// 1. Go to https://supabase.com/dashboard/project/_/settings/api
// 2. Copy the "Project URL" and "anon" public key
const SUPABASE_URL = 'https://zjnumvpoosdirbmcvwcq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqbnVtdnBvb3NkaXJibWN2d2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzODMwMTQsImV4cCI6MjA4Njk1OTAxNH0.Epf0Cpg_sSq6Xjm4ni5xQBL_aKm9RcmuVQLijJcRa-Y';

// Initialize Supabase Client
// Ensure the Supabase JS library is loaded before this script runs
if (typeof window.supabase !== 'undefined') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error('Supabase JS SDK not loaded!');
}
