// js/supabase-client.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://bkaiufangkiubwoamchk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYWl1ZmFuZ2tpdWJ3b2FtY2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODY0OTIsImV4cCI6MjA4NzE2MjQ5Mn0.Ykl_Cnjv0do1bG0PtakBJG_qaCTGeP3-jlDnW9GLe9A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: window.sessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

/**
 * Ensures session is restored and valid.
 * This is still useful as an async check before app initialization.
 */
export async function restoreSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            return false;
        }
        return true;
    } catch (e) {
        console.error('Session restoration failed:', e);
        return false;
    }
}

/**
 * Checks if the Supabase server is reachable.
 */
export async function checkConnectivity() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: 'GET',
            headers: { 'apikey': SUPABASE_ANON_KEY },
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response.ok || response.status === 401; // 401 is fine, means we reached it but didn't auth
    } catch (e) {
        console.error('Connectivity check failed:', e);
        return false;
    }
}

window.supabaseClient = supabase;
