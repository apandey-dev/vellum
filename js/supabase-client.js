// js/supabase-client.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://bkaiufangkiubwoamchk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYWl1ZmFuZ2tpdWJ3b2FtY2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODY0OTIsImV4cCI6MjA4NzE2MjQ5Mn0.Ykl_Cnjv0do1bG0PtakBJG_qaCTGeP3-jlDnW9GLe9A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false // Managed manually via sessionStorage
    }
});

// Expose to window for legacy scripts if needed
window.supabaseClient = supabase;
