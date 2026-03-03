-- ==========================================================
-- SUPABASE COMPLETE RESET & SCHEMA SETUP
-- Project: MindJournal
-- Description: Drops everything and rebuilds schema with Auto-Profile and RLS.
-- ==========================================================

-- 1. DROP EVERYTHING (CLEAN SLATE)
-- We use CASCADE to remove dependent objects (triggers, policies, foreign keys)
DROP TABLE IF EXISTS public.notes CASCADE;
DROP TABLE IF EXISTS public.folders CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop Functions & Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();

-- ==========================================================
-- 2. CREATE TABLES
-- ==========================================================

-- PROFILES (Auto-created, No Approval Status)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- USER SETTINGS
CREATE TABLE public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light',
    editor_font TEXT DEFAULT 'Fredoka',
    editor_font_size INTEGER DEFAULT 16,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- FOLDERS
CREATE TABLE public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- NOTES
CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    title TEXT DEFAULT 'Untitled Note',
    content JSONB DEFAULT '{}'::jsonb, -- Storing rich content/HTML
    is_favorite BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false, -- Kept for sharing feature
    public_expires_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ==========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- ==========================================================
-- 4. RLS POLICIES (STRICT ISOLATION)
-- ==========================================================

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- USER SETTINGS
CREATE POLICY "Users can view own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- FOLDERS
CREATE POLICY "Users can CRUD own folders" ON public.folders
    FOR ALL USING (auth.uid() = user_id);

-- NOTES
CREATE POLICY "Users can CRUD own notes" ON public.notes
    FOR ALL USING (auth.uid() = user_id);

-- Public Read Access for Shared Notes
CREATE POLICY "Public read shared notes" ON public.notes
    FOR SELECT USING (
        is_public = true
        AND (public_expires_at IS NULL OR public_expires_at > now())
    );

-- ==========================================================
-- 5. AUTOMATION TRIGGERS
-- ==========================================================

-- Function: Handle New User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  -- 2. Create Default Settings
  INSERT INTO public.user_settings (user_id)
  VALUES (new.id);

  -- 3. Create Default Folder (Optional but helpful)
  INSERT INTO public.folders (user_id, name)
  VALUES (new.id, 'General');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Run on Signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function: Auto-update `updated_at`
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Run on Note Update
CREATE TRIGGER on_note_update
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ==========================================================
-- DONE
-- ==========================================================
