# Vellum Backend - Deployment & Security

## 1. Deployment Instructions

### Supabase Setup
1. Create a new project on [Supabase](https://supabase.com/).
2. Open the **SQL Editor** in the Supabase dashboard.
3. Copy the contents of `supabase_schema.sql` and run it. This will create the tables, RLS policies, triggers, and the RPC function.
4. Go to **Project Settings > API**.
5. Copy your `Project URL` and `anon public` key.
6. Update `js/supabase-client.js` with these values.

### Vercel Deployment
The project is ready for Vercel. Ensure `vercel.json` is present in the root.
1. Push your code to a GitHub repository.
2. Import the repository into Vercel.
3. Vercel will automatically detect the configuration and deploy.

## 2. Security Explanation

### Authentication
- Uses **Supabase Auth** for secure signup and login.
- **sessionStorage** is used for the active session, ensuring that the session is cleared when the browser tab is closed (as per requirement).
- A **2-hour fixed session timeout** is enforced via `js/auth-guard.js`.

### Database Security (RLS)
- **Row Level Security (RLS)** is enabled on all tables (`profiles`, `folders`, `notes`).
- Users can **only** access rows where `user_id` (or `id` for profiles) matches their authenticated UID.
- Private notes are never exposed.

### Public Sharing
- Toggling a note to "Public" triggers a database-level generation of a unique `public_id` and sets a `public_expires_at` timestamp (24 hours in the future).
- Public notes are accessed via a **Security Definer RPC function** (`get_public_note`).
- This RPC function is the **only** way for unauthenticated users to view a note.
- The RPC function handles expiry **atomically**: it checks the timestamp, and if expired, it immediately reverts the note to private in the database and returns no data.

### Data Integrity
- A database trigger ensures that every new user automatically gets a entry in the `profiles` table.
- **Zero-Initial-State**: No default folders or notes are created automatically. The application shows an "Empty State" UI when no notes are found, allowing for a cleaner user experience and a leaner database.
- Cascade deletes ensure that when a user is deleted, all their data is removed.
- `updated_at` timestamps are automatically managed by triggers.
