/**
 * js/auth.js
 * Signup and Login logic.
 */
import { storage } from './storage.js';
import { session } from './session.js';
import { hashPassword, generateUUID } from './utils.js';

export const auth = {
    async signup(email, password) {
        const existingUser = storage.findUserByEmail(email);
        if (existingUser) {
            throw new Error('User already exists.');
        }

        const passwordHash = await hashPassword(password);
        const newUser = {
            id: generateUUID(),
            email,
            passwordHash,
            createdAt: Date.now()
        };

        storage.saveUser(newUser);
        return session.create(newUser.id);
    },

    async login(email, password) {
        const user = storage.findUserByEmail(email);
        if (!user) {
            throw new Error('Invalid email or password.');
        }

        const passwordHash = await hashPassword(password);
        if (user.passwordHash !== passwordHash) {
            throw new Error('Invalid email or password.');
        }

        return session.create(user.id);
    },

    logout() {
        session.destroy();
        window.location.href = '/login';
    },

    getCurrentUser() {
        const s = session.get();
        if (!s) return null;
        const users = storage.getUsers();
        return users.find(u => u.id === s.userId) || null;
    }
};
