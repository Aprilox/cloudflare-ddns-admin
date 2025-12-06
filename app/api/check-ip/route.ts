import { NextResponse } from 'next/server'
import { getPublicIpWithConsensus } from '@/lib/ddns'

export async function GET() {
  try {
    const result = await getPublicIpWithConsensus()
    
    return NextResponse.json({
      success: true,
      consensusIp: result.consensusIp,
      confidence: result.confidence,
      totalApis: result.totalApis,
      successfulApis: result.successfulApis,
      agreementCount: result.agreementCount,
      results: result.results.map(r => ({
        api: r.api,
        ip: r.ip,
        success: r.success,
        error: r.error,
        responseTime: r.responseTime
      }))
    })
  } catch (error) {
    console.error('Error checking IP:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la vérification de l\'IP' },
      { status: 500 }
    )
  }
}

