import { NextResponse } from 'next/server'
import { isAuthenticated, changePassword } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const authenticated = await isAuthenticated()
    
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }
    
    const { currentPassword, newPassword, confirmPassword } = await req.json()
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      )
    }
    
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Les mots de passe ne correspondent pas' },
        { status: 400 }
      )
    }
    
    const result = await changePassword(currentPassword, newPassword)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Mot de passe modifié avec succès' 
    })
  } catch (error) {
    console.error('Change password API error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
