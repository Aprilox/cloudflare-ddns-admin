import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const settings = await prisma.logSettings.findFirst()
    
    // Retourner les valeurs par défaut si pas de paramètres
    if (!settings) {
      return NextResponse.json({
        id: 1,
        ipChangeLogRetention: 30,
        actionLogRetention: 30,
        statisticsDataRetention: 90,
      })
    }
    
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching log settings:', error)
    return NextResponse.json({ error: 'Failed to fetch log settings' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Valider les valeurs
    const ipChangeLogRetention = Math.max(1, Number(body.ipChangeLogRetention) || 30)
    const actionLogRetention = Math.max(1, Number(body.actionLogRetention) || 30)
    const statisticsDataRetention = Math.max(1, Number(body.statisticsDataRetention) || 90)
    
    const settings = await prisma.logSettings.upsert({
      where: { id: 1 },
      update: {
        ipChangeLogRetention,
        actionLogRetention,
        statisticsDataRetention,
      },
      create: {
        id: 1,
        ipChangeLogRetention,
        actionLogRetention,
        statisticsDataRetention,
      },
    })
    
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating log settings:', error)
    return NextResponse.json({ error: 'Failed to update log settings' }, { status: 500 })
  }
}

