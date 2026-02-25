# Vellum - Minimal Markdown Editor

Vellum is a premium, minimalist Markdown editor designed for speed and simplicity.

## Setup Instructions

### 1. Supabase Initialization
- Run the provided `setup.sql` in your Supabase SQL Editor.
- This will create the `folders` and `notes` tables and set up Row Level Security.

### 2. Authentication Configuration (CRITICAL)
To ensure the "no confirmation email" requirement is met:
1. Go to your **Supabase Dashboard**.
2. Navigate to **Authentication** -> **Providers** -> **Email**.
3. Toggle **OFF** "Confirm email".
4. (Optional) Toggle **OFF** "Secure password change" if you want maximum simplicity.
5. Click **Save**.

### 3. Account Limit
The system is hard-coded to allow a maximum of **10 users**. Any signup attempts beyond this will be blocked at the database level.

### 4. Deployment
Vellum is ready to be deployed on Vercel.
- The `vercel.json` file handles the clean URL rewrites.
- Ensure your environment variables (Supabase URL and Anon Key) are correctly set in `js/supabase-client.js`.

## Features
- **Real-time Markdown Preview**: Live rendering with syntax highlighting.
- **Secure Sharing**: Generate 24-hour public links for your notes.
- **Organization**: Group notes into folders and pin important ones.
- **Export**: Download notes as PDF, Markdown, or Plain Text.
- **Themes**: Seamless switching between light and dark modes.
