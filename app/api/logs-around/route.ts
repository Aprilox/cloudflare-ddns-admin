import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const timestamp = searchParams.get('timestamp')
    
    if (!timestamp) {
      return NextResponse.json({ error: 'Timestamp requis' }, { status: 400 })
    }

    const date = new Date(timestamp)
    const before = new Date(date.getTime() - 30 * 1000) // -30 secondes
    const after = new Date(date.getTime() + 30 * 1000)  // +30 secondes

    const logs = await prisma.actionLog.findMany({
      where: {
        timestamp: {
          gte: before,
          lte: after
        }
      },
      orderBy: { timestamp: 'asc' },
      take: 100
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Error fetching logs around timestamp:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

