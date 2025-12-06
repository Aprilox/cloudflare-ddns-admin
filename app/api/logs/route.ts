import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const logs = await prisma.ipChangeLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    })
    return NextResponse.json(logs)
  } catch (error) {
    console.error('Error fetching IP change logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}

