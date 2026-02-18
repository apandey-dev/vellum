// js/auth.js
// Authentication and session management

import { supabase } from '/js/supabase-client.js';

export async function validateSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
        return null;
    }
    return session.user;
}

export async function fetchUserProfile(userId) {
    if (!userId) return null;
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
    return profile;
}

export function updateProfileUI(user, profile) {
    if (!user) return;
    const initial = (profile?.full_name?.[0] || user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase();
    const avatar = document.getElementById('userAvatar');
    if (avatar) avatar.textContent = initial;

    // Also update modal
    const modalAvatar = document.getElementById('modalAvatar');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileDate = document.getElementById('profileDate');
    const profileStatus = document.getElementById('profileStatus');

    if (modalAvatar) modalAvatar.textContent = initial;
    if (profileName) profileName.textContent = profile?.full_name || user.user_metadata?.full_name || 'User';
    if (profileEmail) profileEmail.textContent = user.email;
    if (profileDate) profileDate.textContent = new Date(user.created_at).toLocaleDateString();

    if (profileStatus) {
        profileStatus.textContent = profile?.status === 'active' ? 'Active' : 'Pending';
        profileStatus.style.background = profile?.status === 'active' ? '#10b981' : '#f59e0b';
    }
}

// Global auth state
export let currentUser = null;
export let currentProfile = null;

export async function checkAuthAndProfile() {
    currentUser = await validateSession();
    if (!currentUser) {
        return { authenticated: false };
    }

    currentProfile = await fetchUserProfile(currentUser.id);

    if (!currentProfile || currentProfile.status !== 'active') {
        // If pending or not found, we might still allow login but restricted
        // According to the spec: "Until active: User can login. BUT: Their data must not persist..."
        return { authenticated: true, isActive: false, user: currentUser, profile: currentProfile };
    }

    return { authenticated: true, isActive: true, user: currentUser, profile: currentProfile };
}

window.validateSession = validateSession;
