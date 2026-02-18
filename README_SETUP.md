# MindJournal - Stabilization & Setup Guide

This document summarizes the recent architectural changes and provides instructions for setting up your Supabase database and email templates correctly.

## 🛠️ Recent Changes
- **Modular Architecture:** All JavaScript logic has been moved from the root to the `/js` directory for better organization.
- **Centralized Supabase:** Initialization is now handled in `js/supabase-client.js`.
- **Improved Initialization:** The app now follows a strict lifecycle: Session Check → Routing → Data Loading → UI Rendering.
- **Robust Modals:** Modal handling now uses event delegation and is less prone to "undefined" errors.
- **Custom Confirmation Flow:** A professional verification screen has been added at `/auth/confirm.html`.

---

## 🗄️ Database Setup (SQL)
Run the following SQL in your Supabase SQL Editor to ensure your tables and policies are correctly configured.

```sql
-- 1. PROFILES TABLE
-- This table automatically gets a row when a new user signs up.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    status TEXT CHECK (status IN ('pending', 'active')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. FOLDERS TABLE
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own folders" ON public.folders FOR ALL USING (auth.uid() = user_id);

-- 3. NOTES TABLE
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    title TEXT,
    content TEXT,
    is_pinned BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    public_expires_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Only allow CRUD if user status is 'active'
CREATE POLICY "Active users can CRUD own notes"
ON public.notes FOR ALL
USING (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.status = 'active'
    )
);

-- 4. AUTO-CREATE PROFILE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'pending');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Uncomment the next line if the trigger doesn't exist yet
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 📧 Email Template Configuration

To set up the custom email confirmation flow, go to **Supabase Dashboard → Authentication → Email Templates**.

### 1. Confirm Signup Template
Replace the content of the "Confirm Signup" template with the following HTML.

**Subject:**
`Confirm your MindJournal Account`

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #3b82f6;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-family: sans-serif;
            font-weight: bold;
        }
    </style>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333;">
    <h2>Welcome to MindJournal!</h2>
    <p>Please click the button below to verify your email address and activate your account.</p>
    <p>
        <a href="https://apandey-mindjournal.vercel.app/auth/confirm.html?token_hash={{ .TokenHash }}&type=signup" class="button">
            Confirm My Account
        </a>
    </p>
    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p>https://apandey-mindjournal.vercel.app/auth/confirm.html?token_hash={{ .TokenHash }}&type=signup</p>
    <hr>
    <p><small>If you didn't create this account, you can safely ignore this email.</small></p>
</body>
</html>
```

---

## 🛡️ Admin Instructions: Approving Users
When a user signs up, their status is `pending` by default. They will see the "Account Pending Approval" screen.

To approve a user and allow them to start writing notes:
1. Go to the **Supabase Table Editor**.
2. Select the `profiles` table.
3. Find the user's row and change the `status` from `pending` to `active`.

The user's dashboard will automatically unlock on their next refresh or navigation.
