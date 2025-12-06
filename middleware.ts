import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
)

// Routes publiques (pas besoin d'authentification)
const publicRoutes = ['/login', '/api/auth/login']

// Routes API protégées
const protectedApiRoutes = [
  '/api/ddns-config',
  '/api/ddns-worker',
  '/api/logs',
  '/api/action-logs',
  '/api/stats',
  '/api/settings',
  '/api/log-settings',
  '/api/notifications',
  '/api/delete-logs',
  '/api/init',
  '/api/auth/change-password',
  '/api/auth/me',
  '/api/auth/logout',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Permettre l'accès aux routes publiques
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }
  
  // Permettre l'accès aux fichiers statiques
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }
  
  // Vérifier l'authentification
  const token = request.cookies.get('auth-token')?.value
  
  if (!token) {
    // Pour les routes API, retourner 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }
    // Pour les autres routes, rediriger vers login
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Vérifier la validité du token
  try {
    await jwtVerify(token, JWT_SECRET)
    
    // Si l'utilisateur est authentifié et essaie d'accéder à /login, rediriger vers /
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    return NextResponse.next()
  } catch {
    // Token invalide
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Token invalide' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))
    
    // Supprimer le cookie invalide
    response.cookies.delete('auth-token')
    
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

