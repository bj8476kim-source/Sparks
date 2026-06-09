import { createBrowserClient } from '@supabase/ssr';

// createBrowserClient는 세션을 쿠키에 저장해 미들웨어에서 읽을 수 있습니다.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'
);
