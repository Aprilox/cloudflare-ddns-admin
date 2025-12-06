import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const body = await req.json()
  const settings = await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.settings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      })
    )
  )
  return NextResponse.json(settings)
}

export async function GET() {
  const settings = await prisma.settings.findMany()
  return NextResponse.json(Object.fromEntries(settings.map(({ key, value }) => [key, value])))
}

