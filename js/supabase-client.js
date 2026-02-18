// js/supabase-client.js
// Centralized Supabase client initialization

const SUPABASE_URL = 'https://zjnumvpoosdirbmcvwcq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqbnVtdnBvb3NkaXJibWN2d2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzODMwMTQsImV4cCI6MjA4Njk1OTAxNH0.Epf0Cpg_sSq6Xjm4ni5xQBL_aKm9RcmuVQLijJcRa-Y';

// Using the ES Module version of Supabase from CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Also expose to window for any remaining non-module scripts during transition
window.supabaseClient = supabase;
