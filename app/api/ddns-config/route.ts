import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getConfig } from '@/lib/ddns'

export async function GET() {
  try {
    const config = await getConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching DDNS config:', error)
    return NextResponse.json({ error: 'Failed to fetch DDNS config' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Assurez-vous que tous les champs requis sont présents
    const configData = {
      cloudflareToken: body.cloudflareToken || '',
      zoneId: body.zoneId || '',
      recordName: body.recordName || '',
      ttl: body.ttl || 1,
      proxy: body.proxy === undefined ? true : body.proxy,
      checkInterval: body.checkInterval || 300,
      verificationCount: body.verificationCount || 3,
      verificationDelay: body.verificationDelay || 10
    }
    
    const config = await prisma.dDNSConfig.upsert({
      where: { id: 1 },
      update: configData,
      create: { ...configData, id: 1 }
    })
    
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error updating DDNS config:', error)
    return NextResponse.json({ error: 'Failed to update DDNS config' }, { status: 500 })
  }
}