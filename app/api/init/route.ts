import { NextResponse } from 'next/server'
import { initializeWorker } from '@/lib/ddns'
import prisma from '@/lib/prisma'

// Nettoyage des logs anciens
async function cleanupOldLogs() {
  try {
    const settings = await prisma.logSettings.findFirst()
    if (!settings) return

    const now = new Date()
    
    if (settings.ipChangeLogRetention > 0) {
      const date = new Date(now.getTime() - settings.ipChangeLogRetention * 24 * 60 * 60 * 1000)
      await prisma.ipChangeLog.deleteMany({ where: { timestamp: { lt: date } } })
    }

    if (settings.actionLogRetention > 0) {
      const date = new Date(now.getTime() - settings.actionLogRetention * 24 * 60 * 60 * 1000)
      await prisma.actionLog.deleteMany({ where: { timestamp: { lt: date } } })
    }
  } catch (error) {
    console.error('Error during log cleanup:', error)
  }
}

export async function GET() {
  try {
    // TOUJOURS appeler initializeWorker - il gère lui-même si l'intervalle doit être relancé
    await initializeWorker()
    
    // Nettoyer les anciens logs
    await cleanupOldLogs()
    
    return NextResponse.json({ message: 'OK', status: 'success' })
  } catch (error) {
    console.error('Error initializing worker:', error)
    return NextResponse.json({ 
      message: 'Error',
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, { status: 500 })
  }
}
