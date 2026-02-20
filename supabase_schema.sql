-- Vellum Supabase Schema

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Folders Table
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE DEFAULT auth.uid(),
    folder_id UUID REFERENCES public.folders ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    is_pinned BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    public_id TEXT UNIQUE,
    public_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Folders
DROP POLICY IF EXISTS "Folders SELECT" ON public.folders;
CREATE POLICY "Folders SELECT" ON public.folders FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Folders INSERT" ON public.folders;
CREATE POLICY "Folders INSERT" ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Folders UPDATE" ON public.folders;
CREATE POLICY "Folders UPDATE" ON public.folders FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Folders DELETE" ON public.folders;
CREATE POLICY "Folders DELETE" ON public.folders FOR DELETE USING (auth.uid() = user_id);

-- Notes
DROP POLICY IF EXISTS "Notes SELECT" ON public.notes;
CREATE POLICY "Notes SELECT" ON public.notes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Notes INSERT" ON public.notes;
CREATE POLICY "Notes INSERT" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Notes UPDATE" ON public.notes;
CREATE POLICY "Notes UPDATE" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Notes DELETE" ON public.notes;
CREATE POLICY "Notes DELETE" ON public.notes FOR DELETE USING (auth.uid() = user_id);

-- 6. Trigger: Handle New User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_folder_id UUID;
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (new.id, new.email);

    -- Create 'General' folder for the user
    INSERT INTO public.folders (user_id, name)
    VALUES (new.id, 'General')
    RETURNING id INTO new_folder_id;

    -- Create initial note
    INSERT INTO public.notes (user_id, folder_id, title, content)
    VALUES (new.id, new_folder_id, 'NewNote', '');

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Trigger: Handle Public ID and Expiry
CREATE OR REPLACE FUNCTION public.handle_note_sharing()
RETURNS trigger AS $$
BEGIN
    -- If is_public becomes true
    IF NEW.is_public = true AND (OLD.is_public = false OR OLD.is_public IS NULL) THEN
        IF NEW.public_id IS NULL THEN
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

-- Re-create trigger
DROP TRIGGER IF EXISTS on_note_share_toggle ON public.notes;
CREATE TRIGGER on_note_share_toggle
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_note_sharing();

-- 8. RPC: Fetch Public Note (handles expiry atomically)
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
