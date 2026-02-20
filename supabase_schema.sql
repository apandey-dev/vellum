-- ========================================================
-- 1️⃣ FULL CLEAN RESET
-- ========================================================
-- Drop only app tables (not auth schema)
DROP TABLE IF EXISTS public.notes CASCADE;
DROP TABLE IF EXISTS public.folders CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Clean any leftover policies
DROP POLICY IF EXISTS "Users can manage their folders" ON public.folders;
DROP POLICY IF EXISTS "Users can manage their notes" ON public.notes;
DROP POLICY IF EXISTS "Users can manage their profiles" ON public.profiles;

-- ========================================================
-- 2️⃣ RECREATE TABLES (Corrected Version)
-- ========================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table (Requirement 1 & 2)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Folders table
CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notes table (Requirement 3 & 4)
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  title TEXT DEFAULT 'Untitled',
  content TEXT DEFAULT '',
  is_public BOOLEAN DEFAULT false,
  public_id TEXT UNIQUE,
  public_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================================
-- 3️⃣ FIX PERMISSIONS (Eliminates permission denied)
-- ========================================================
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.folders TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.notes TO anon, authenticated, service_role;

-- ========================================================
-- 4️⃣ ENABLE RLS
-- ========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- 5️⃣ CREATE PROPER POLICIES
-- ========================================================

-- Profiles Policy
CREATE POLICY "Users can manage their profiles"
ON public.profiles FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Folders Policy
CREATE POLICY "Users can manage their folders"
ON public.folders FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Notes Policy
CREATE POLICY "Users can manage their notes"
ON public.notes FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ========================================================
-- 6️⃣ AUTOMATION (Triggers & Functions)
-- ========================================================

-- Trigger: Create Profile on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (new.id, new.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Handle Public ID and Expiry
CREATE OR REPLACE FUNCTION public.handle_note_sharing()
RETURNS trigger AS $$
BEGIN
    -- If is_public becomes true
    IF NEW.is_public = true AND (OLD.is_public = false OR OLD.is_public IS NULL) THEN
        IF NEW.public_id IS NULL THEN
            -- Generate a unique short hex ID
            NEW.public_id := encode(gen_random_bytes(6), 'hex');
        END IF;
        NEW.public_expires_at := now() + interval '24 hours';
    -- If is_public becomes false
    ELSIF NEW.is_public = false AND OLD.is_public = true THEN
        NEW.public_id := NULL;
        NEW.public_expires_at := NULL;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_note_share_toggle ON public.notes;
CREATE TRIGGER on_note_share_toggle
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_note_sharing();

-- RPC: Fetch Public Note (Requirement 5 & 6)
-- Handles expiry atomically and returns content if valid
CREATE OR REPLACE FUNCTION public.get_public_note(p_public_id TEXT)
RETURNS TABLE (
    title TEXT,
    content TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Check expiry and update if necessary
    UPDATE public.notes
    SET is_public = false,
        public_id = NULL,
        public_expires_at = NULL
    WHERE public_id = p_public_id
      AND public_expires_at < now();

    -- Return the note if it's still public
    RETURN QUERY
    SELECT n.title, n.content, n.updated_at
    FROM public.notes n
    WHERE n.public_id = p_public_id
      AND n.is_public = true
      AND n.public_expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
