import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { login } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const { password } = await req.json()
    
    if (!password) {
      return NextResponse.json(
        { error: 'Mot de passe requis' },
        { status: 400 }
      )
    }
    
    const result = await login(password)
    
    if (!result.success || !result.token) {
      return NextResponse.json(
        { error: result.error || 'Mot de passe incorrect' },
        { status: 401 }
      )
    }
    
    // Définir le cookie d'authentification
    const cookieStore = await cookies()
    cookieStore.set('auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: parseInt(process.env.JWT_EXPIRATION || '86400'),
      path: '/'
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Connexion réussie' 
    })
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la connexion' },
      { status: 500 }
    )
  }
}
