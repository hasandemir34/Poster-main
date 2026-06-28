import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── SUPABASE YAPILANDIRMASI ──────────────────────────────────────────────────
// Supabase Dashboard → Project Settings → API'den alın.
// anon key client tarafında açıkta olur; bu normaldir. Güvenlik RLS ile sağlanır.
export const SUPABASE_URL      = 'https://YOUR_PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tasarım PDF'lerinin tutulduğu Storage bucket'ı (private).
export const DESIGN_BUCKET = 'order-designs';
