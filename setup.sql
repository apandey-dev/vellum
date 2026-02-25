-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if any (Clean rebuild)
DROP TABLE IF EXISTS public.notes;
DROP TABLE IF EXISTS public.folders;

-- 3. Create Folders Table
CREATE TABLE public.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Notes Table
CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    title TEXT DEFAULT 'Untitled Note',
    content TEXT DEFAULT '',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    share_token TEXT UNIQUE,
    share_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for Folders
CREATE POLICY "Users can view their own folders" ON public.folders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders" ON public.folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" ON public.folders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" ON public.folders
    FOR DELETE USING (auth.uid() = user_id);

-- 7. RLS Policies for Notes
CREATE POLICY "Users can view their own notes" ON public.notes
    FOR SELECT USING (auth.uid() = user_id OR (is_public = true AND share_expires_at > NOW()));

CREATE POLICY "Users can insert their own notes" ON public.notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON public.notes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON public.notes
    FOR DELETE USING (auth.uid() = user_id);

-- 8. Function to handle 10-user limit
CREATE OR REPLACE FUNCTION public.check_user_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT count(*) FROM auth.users) >= 10 THEN
        RAISE EXCEPTION 'Signup Blocked: User limit reached. Contact Admin.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for user limit (on auth.users)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        DROP TRIGGER IF EXISTS trigger_check_user_limit ON auth.users;
        CREATE TRIGGER trigger_check_user_limit
        BEFORE INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.check_user_limit();
    END IF;
END $$;

-- 9. RPC function for secure sharing
CREATE OR REPLACE FUNCTION public.share_note(p_note_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_token TEXT;
BEGIN
    -- Ensure the user owns the note
    IF NOT EXISTS (SELECT 1 FROM public.notes WHERE id = p_note_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    v_token := encode(gen_random_bytes(16), 'hex');

    UPDATE public.notes
    SET is_public = true,
        share_token = v_token,
        share_expires_at = NOW() + INTERVAL '24 hours'
    WHERE id = p_note_id;

    RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC function to get public note
CREATE OR REPLACE FUNCTION public.get_public_note(p_share_token TEXT)
RETURNS TABLE (
    title TEXT,
    content TEXT,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Cleanup expired note if found
    UPDATE public.notes
    SET is_public = false,
        share_token = NULL,
        share_expires_at = NULL
    WHERE share_token = p_share_token
      AND is_public = true
      AND share_expires_at <= NOW();

    RETURN QUERY
    SELECT n.title, n.content, n.updated_at
    FROM public.notes n
    WHERE n.share_token = p_share_token
      AND n.is_public = true
      AND n.share_expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant permissions
GRANT ALL ON public.folders TO authenticated, anon, service_role;
GRANT ALL ON public.notes TO authenticated, anon, service_role;
