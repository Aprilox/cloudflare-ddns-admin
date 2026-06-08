import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const PROTECTED_KEYS = ['admin_password']

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const entries = Object.entries(body).filter(([key]) => !PROTECTED_KEYS.includes(key))
    const settings = await Promise.all(
      entries.map(([key, value]) =>
        prisma.settings.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) }
        })
      )
    )
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Erreur lors de la sauvegarde des paramètres' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const settings = await prisma.settings.findMany()
    return NextResponse.json(Object.fromEntries(settings.map(({ key, value }) => [key, value])))
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des paramètres' }, { status: 500 })
  }
}

