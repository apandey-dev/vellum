# Vellum - Minimal Markdown Editor (Browser-Only Edition)

Vellum is a premium, minimalist Markdown editor that runs entirely in your browser using `localStorage` and `sessionStorage`.

## Architecture

This project has been rebuilt to remove all external backend dependencies (Supabase). It uses a modular JavaScript architecture for clean data management.

### Data Layer
- **`localStorage`**: Persistent storage for Users, Notes, and Folders.
- **`sessionStorage`**: Secure session management that expires when the tab is closed.

### Modules
- **`js/storage.js`**: Abstraction layer for `localStorage` CRUD operations.
- **`js/auth.js`**: Handles Signup, Login, and SHA-256 password hashing.
- **`js/session.js`**: Manages the 2-hour session expiry and auto-logout.
- **`js/share.js`**: Implements 24-hour expiring share links.
- **`js/notes.js`**: High-level note management logic.
- **`js/utils.js`**: Helpers for UUID generation and cryptographic hashing.

## Features
- **Zero-Backend**: No database setup required. Just open `index.html`.
- **Privacy First**: Passwords are never stored in plain text (SHA-256). Sessions are isolated to the current tab.
- **Auto-Expiry**: Public share links automatically expire after 24 hours.
- **User Limit**: The system supports up to 10 local accounts.
- **Folders & Pins**: Organize and prioritize your notes locally.

## Development
To run locally, simply serve the root directory using any static file server:
```bash
npx serve .
```
