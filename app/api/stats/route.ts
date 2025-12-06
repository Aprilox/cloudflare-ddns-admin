import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const totalChanges = await prisma.ipChangeLog.count()
    const averageChangeDuration = await prisma.ipChangeLog.aggregate({
      _avg: { changeDuration: true }
    })

    return NextResponse.json({
      totalChanges,
      averageChangeDuration: Number((averageChangeDuration._avg.changeDuration || 0).toFixed(2))
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

