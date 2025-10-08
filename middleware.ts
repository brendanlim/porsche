import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Get user session
  const { data: { user }, error } = await supabase.auth.getUser();

  // Define admin routes that require specific email
  const adminRoutes = ['/admin'];
  const ADMIN_EMAIL = 'brendangl@gmail.com';

  // Define protected routes that require authentication
  const protectedRoutes = [
    '/garage',
    '/account',
    '/api/user-cars',
    '/api/valuations'
  ];

  // Define premium routes that require subscription
  const premiumRoutes = [
    '/garage/analytics',
    '/api/premium'
  ];

  const pathname = request.nextUrl.pathname;

  // Check if the route is admin
  const isAdminRoute = adminRoutes.some(route =>
    pathname.startsWith(route)
  );

  // Check admin access
  if (isAdminRoute) {
    if (!user || error) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user is admin
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  const isPremiumRoute = premiumRoutes.some(route =>
    pathname.startsWith(route)
  );

  // Redirect to login if accessing protected route without authentication
  if (isProtectedRoute && (!user || error)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check premium subscription for premium routes
  if (isPremiumRoute && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_status !== 'premium') {
      // Redirect to pricing page for premium features
      const pricingUrl = new URL('/pricing', request.url);
      pricingUrl.searchParams.set('feature', 'premium-required');
      return NextResponse.redirect(pricingUrl);
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/garage';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};