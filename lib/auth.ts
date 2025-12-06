import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import prisma from './prisma'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
)
const JWT_EXPIRATION = parseInt(process.env.JWT_EXPIRATION || '86400')

export interface JWTPayload {
  authenticated: boolean
  exp?: number
}

// Créer un token JWT
export async function createToken(): Promise<string> {
  return new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRATION}s`)
    .sign(JWT_SECRET)
}

// Vérifier un token JWT
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

// Vérifier si l'utilisateur est authentifié
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  
  if (!token) return false
  
  const payload = await verifyToken(token)
  return payload?.authenticated === true
}

// Hash du mot de passe
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

// Vérifier le mot de passe
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Obtenir ou créer le mot de passe admin
async function getAdminPassword(): Promise<string | null> {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'admin_password' }
    })
    return setting?.value || null
  } catch {
    return null
  }
}

// Initialiser le mot de passe par défaut
export async function initializeDefaultPassword(): Promise<void> {
  try {
    const existingPassword = await getAdminPassword()
    
    if (!existingPassword) {
      const hashedPassword = await hashPassword('admin')
      await prisma.settings.upsert({
        where: { key: 'admin_password' },
        update: { value: hashedPassword },
        create: { key: 'admin_password', value: hashedPassword }
      })
      console.log('Default admin password created: admin')
    }
  } catch (error) {
    console.error('Error initializing default password:', error)
  }
}

// Login avec mot de passe uniquement
export async function login(password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    // Initialiser le mot de passe par défaut si nécessaire
    await initializeDefaultPassword()
    
    const hashedPassword = await getAdminPassword()
    
    if (!hashedPassword) {
      return { success: false, error: 'Erreur de configuration' }
    }
    
    const isValid = await verifyPassword(password, hashedPassword)
    
    if (!isValid) {
      return { success: false, error: 'Mot de passe incorrect' }
    }
    
    const token = await createToken()
    
    return { success: true, token }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'Erreur lors de la connexion' }
  }
}

// Changer le mot de passe
export async function changePassword(
  currentPassword: string, 
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const hashedPassword = await getAdminPassword()
    
    if (!hashedPassword) {
      return { success: false, error: 'Erreur de configuration' }
    }
    
    const isValid = await verifyPassword(currentPassword, hashedPassword)
    
    if (!isValid) {
      return { success: false, error: 'Mot de passe actuel incorrect' }
    }
    
    if (newPassword.length < 4) {
      return { success: false, error: 'Le nouveau mot de passe doit contenir au moins 4 caractères' }
    }
    
    const newHashedPassword = await hashPassword(newPassword)
    
    await prisma.settings.update({
      where: { key: 'admin_password' },
      data: { value: newHashedPassword }
    })
    
    return { success: true }
  } catch (error) {
    console.error('Change password error:', error)
    return { success: false, error: 'Erreur lors du changement de mot de passe' }
  }
}
