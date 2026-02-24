// js/supabase-client.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://bkaiufangkiubwoamchk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYWl1ZmFuZ2tpdWJ3b2FtY2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODY0OTIsImV4cCI6MjA4NzE2MjQ5Mn0.Ykl_Cnjv0do1bG0PtakBJG_qaCTGeP3-jlDnW9GLe9A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false, // Managed manually via sessionStorage for security
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

/**
 * Restores session from sessionStorage
 * returns true if session exists and was set, false otherwise
 */
export async function restoreSession() {
    const sessionStr = sessionStorage.getItem('vellum_session');
    if (!sessionStr) return false;

    try {
        const session = JSON.parse(sessionStr);
        if (!session.access_token || !session.refresh_token) return false;

        // Attempt to set the session in Supabase client
        const { data, error } = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token
        });

        if (error) {
            console.error("Supabase session restore failed:", error.message);
            // Clear invalid session
            sessionStorage.removeItem('vellum_session');
            sessionStorage.removeItem('vellum_login_time');
            return false;
        }

        // Update sessionStorage with fresh tokens (rotated)
        if (data.session) {
            sessionStorage.setItem('vellum_session', JSON.stringify(data.session));
        }

        return true;
    } catch (e) {
        console.error("Failed to parse session string:", e);
        return false;
    }
}

// Expose to window for legacy scripts and debugging
window.supabaseClient = supabase;
