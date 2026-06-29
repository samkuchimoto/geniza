-- ============================================================
-- GENIZA — Supabase RPC Functions
-- Run these in the Supabase SQL editor after the main schema.
-- ============================================================

-- Increment completed trades counter on a profile
CREATE OR REPLACE FUNCTION increment_completed_trades(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    completed_trades = completed_trades + 1,
    collector_score = LEAST(100, collector_score + 3)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment completed sales counter on a profile
CREATE OR REPLACE FUNCTION increment_completed_sales(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    completed_sales = completed_sales + 1,
    collector_score = LEAST(100, collector_score + 2)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supabase Storage bucket setup
-- Run this once in the SQL editor or via the Storage UI:
-- 1. Create bucket named "item-images"
-- 2. Set public: true (public read)
-- 3. Add the following policy for authenticated uploads:

INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload item images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'item-images');

CREATE POLICY "Anyone can read item images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'item-images');

CREATE POLICY "Users can delete their own item images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'item-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::TEXT FROM public.items WHERE seller_id = auth.uid()
  )
);
