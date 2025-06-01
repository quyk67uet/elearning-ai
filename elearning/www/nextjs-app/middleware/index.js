import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request) {
  try {
    // Get the pathname
    const { pathname } = request.nextUrl;

    // Skip middleware for certain paths
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/static') ||
      pathname.startsWith('/api/auth') ||
      pathname.includes('favicon')
    ) {
      return NextResponse.next();
    }

    // Get NextAuth token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Check if it's an API call to Frappe
    const isFrappeAPICall = pathname.startsWith('/api') && 
                           !pathname.startsWith('/api/auth');

    // If it's an API call to Frappe and we have auth token
    if (isFrappeAPICall && token?.frappeSid) {
      const response = NextResponse.next();
      
      // Forward Frappe SID cookie
      response.cookies.set('sid', token.frappeSid, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax'
      });
      
      // Add CSRF token if available
      if (token.frappeCSRFToken) {
        response.cookies.set('frappe_csrf_token', token.frappeCSRFToken, {
          path: '/',
          httpOnly: false,
          sameSite: 'lax'
        });
      }
      
      return response;
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 