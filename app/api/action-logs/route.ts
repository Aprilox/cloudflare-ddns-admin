import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500)
    const offset = Number(searchParams.get('offset')) || 0

    const logs = await prisma.actionLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset
    })
    
    const total = await prisma.actionLog.count()
    
    return NextResponse.json({ logs, total, limit, offset })
  } catch (error) {
    console.error('Error fetching action logs:', error)
    return NextResponse.json({ error: 'Failed to fetch action logs' }, { status: 500 })
  }
}

