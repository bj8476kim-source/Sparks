import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /_next, /api, 정적 파일 확장자, /favicon.ico는 세션 검증 없이 즉시 통과
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico' ||
    /\.\w+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session }, error } = await supabase.auth.getSession();
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  // getSession 실패 · 세션 없음 · adminEmail 미설정 → 로그인 폼 노출을 위해 통과
  if (error || !session || !adminEmail) {
    return response;
  }

  // 유효한 세션이 있고 어드민 이메일이 아닌 경우에만 메인으로 차단
  if (session.user.email !== adminEmail) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
