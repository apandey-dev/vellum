/**
 * js/session.js
 * Session management using sessionStorage.
 */

const SESSION_KEY = 'vellum_session';
const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in ms

export const session = {
    create(userId) {
        const data = {
            userId,
            loginTime: Date.now(),
            expiresAt: Date.now() + SESSION_TIMEOUT
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
        return data;
    },

    get() {
        const data = sessionStorage.getItem(SESSION_KEY);
        if (!data) return null;

        const parsed = JSON.parse(data);
        if (Date.now() > parsed.expiresAt) {
            this.destroy();
            return null;
        }
        return parsed;
    },

    destroy() {
        sessionStorage.removeItem(SESSION_KEY);
    },

    isValid() {
        return !!this.get();
    },

    initAutoLogout() {
        // Check session validity periodically
        setInterval(() => {
            if (!this.isValid()) {
                window.location.href = '/login';
            }
        }, 60000); // Check every minute

        // Optional: extra aggressive cleanup
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && !this.isValid()) {
                window.location.href = '/login';
            }
        });
    }
};
