'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'

interface ApiResult {
  api: string
  ip: string | null
  success: boolean
  error?: string
  responseTime: number
}

interface IpResult {
  consensusIp: string | null
  confidence: number
  successfulApis: number
  totalApis: number
  agreementCount: number
  results: ApiResult[]
}

export function IpChecker() {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<IpResult | null>(null)

  const check = async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/check-ip')
      if (res.ok) setResult(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setChecking(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Diagnostic IP</CardTitle>
        <Button onClick={check} disabled={checking} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
          Tester
        </Button>
      </CardHeader>
      <CardContent>
        {!result && !checking && (
          <p className="text-sm text-muted-foreground">
            Teste 10 APIs pour déterminer votre IP publique avec consensus.
          </p>
        )}

        {result && (
          <div className="space-y-4">
            {/* Résultat principal */}
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-muted-foreground">IP détectée</span>
                <span className={`text-sm font-medium ${
                  result.confidence >= 70 ? 'text-success' : 
                  result.confidence >= 50 ? 'text-warning' : 'text-destructive'
                }`}>
                  {result.confidence}% confiance
                </span>
              </div>
              <p className="text-2xl font-mono font-bold">
                {result.consensusIp || '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {result.agreementCount}/{result.successfulApis} APIs d&apos;accord
              </p>
            </div>

            {/* Liste APIs */}
            <div className="space-y-1">
              {result.results.map((r) => (
                <div key={r.api} className="flex items-center justify-between py-1.5 px-2 rounded text-sm hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    {r.success ? (
                      <CheckCircle className={`h-4 w-4 ${r.ip === result.consensusIp ? 'text-success' : 'text-warning'}`} />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>{r.api}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="font-mono text-xs">
                      {r.success ? r.ip : r.error?.slice(0, 20)}
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {r.responseTime}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
