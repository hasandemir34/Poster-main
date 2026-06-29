import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── SUPABASE YAPILANDIRMASI ──────────────────────────────────────────────────
// Supabase Dashboard → Project Settings → API'den alın.
// anon key client tarafında açıkta olur; bu normaldir. Güvenlik RLS ile sağlanır.
export const SUPABASE_URL      = 'https://ilqgbdaimlicbigdytrv.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlscWdiZGFpbWxpY2JpZ2R5dHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTM1MzAsImV4cCI6MjA5ODEyOTUzMH0.8Vj3Wr0hYaow3Sn38YB4AilhbKFu11Ecxtbt6EXsWZA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tasarım PDF'lerinin tutulduğu Storage bucket'ı (private).
export const DESIGN_BUCKET = 'order-designs';
