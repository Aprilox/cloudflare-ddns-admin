import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'

export async function GET() {
  try {
    const authenticated = await isAuthenticated()
    
    if (!authenticated) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      )
    }
    
    return NextResponse.json({
      authenticated: true
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { authenticated: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
