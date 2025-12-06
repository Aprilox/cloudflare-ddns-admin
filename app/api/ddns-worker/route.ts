import { NextResponse } from 'next/server'
import { getConfig, startWorker, stopWorker, isWorkerRunning } from '@/lib/ddns'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  console.log(`DDNS worker API called with action: ${action}`);

  try {
    if (action === 'stop') {
      await stopWorker()
      return NextResponse.json({ message: 'Worker DDNS arrêté', status: 'stopped' })
    }

    if (action === 'status') {
      const status = await isWorkerRunning() ? 'running' : 'stopped'
      return NextResponse.json({ status })
    }

    if (action === 'start') {
      const config = await getConfig()
      if (!config.cloudflareToken || !config.zoneId || !config.recordName) {
        return NextResponse.json({ message: 'Configuration DDNS incomplète', status: 'error' })
      }
      await startWorker(config)
      return NextResponse.json({ message: 'Worker DDNS démarré', status: 'running' })
    }

    return NextResponse.json({ message: 'Action non reconnue', status: 'error' })
  } catch (error) {
    console.error('Error in DDNS worker API:', error);
    return NextResponse.json({ 
      message: 'Erreur lors de la gestion du worker', 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

