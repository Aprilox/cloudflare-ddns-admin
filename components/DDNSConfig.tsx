'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Save, RefreshCw } from 'lucide-react'

interface Config {
  cloudflareToken: string
  zoneId: string
  recordName: string
  ttl: number
  proxy: boolean
  checkInterval: number
  verificationCount: number
  verificationDelay: number
}

const defaults: Config = {
  cloudflareToken: '', zoneId: '', recordName: '',
  ttl: 1, proxy: true, checkInterval: 300,
  verificationCount: 3, verificationDelay: 10
}

export function DDNSConfig() {
  const [config, setConfig] = useState<Config>(defaults)
  const [show, setShow] = useState({ token: false, zone: false, record: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetch('/api/ddns-config')
      .then(r => r.json())
      .then(data => setConfig({
        cloudflareToken: data.cloudflareToken ?? '',
        zoneId: data.zoneId ?? '',
        recordName: data.recordName ?? '',
        ttl: data.ttl ?? 1,
        proxy: data.proxy ?? true,
        checkInterval: data.checkInterval ?? 300,
        verificationCount: data.verificationCount ?? 3,
        verificationDelay: data.verificationDelay ?? 10
      }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/ddns-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      if (res.ok) {
        toast({ title: "Configuration sauvegardée" })
        // Redémarrer le worker avec la nouvelle config si elle est complète
        if (config.cloudflareToken && config.zoneId && config.recordName) {
          await fetch('/api/ddns-worker?action=stop')
          await fetch('/api/ddns-worker?action=start')
        }
      }
    } catch {
      toast({ variant: "destructive", title: "Erreur" })
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof Config, value: string | number | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  if (loading) return <Card><CardContent className="p-8 text-center text-muted-foreground">Chargement...</CardContent></Card>

  const SecureInput = ({ name, label, value }: { name: 'token' | 'zone' | 'record', label: string, value: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={show[name] ? 'text' : 'password'}
          value={value || ''}
          onChange={e => update(name === 'token' ? 'cloudflareToken' : name === 'zone' ? 'zoneId' : 'recordName', e.target.value)}
          className="pr-10"
        />
        <button type="button" onClick={() => setShow(s => ({ ...s, [name]: !s[name] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {show[name] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Configuration Cloudflare</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <SecureInput name="token" label="API Token" value={config.cloudflareToken} />
          <SecureInput name="zone" label="Zone ID" value={config.zoneId} />
          <SecureInput name="record" label="Record Name" value={config.recordName} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>TTL</Label>
              <Input type="number" value={config.ttl} onChange={e => update('ttl', +e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Intervalle (s)</Label>
              <Input type="number" value={config.checkInterval} onChange={e => update('checkInterval', +e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vérifications</Label>
              <Input type="number" min={1} max={10} value={config.verificationCount} onChange={e => update('verificationCount', +e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Délai vérif. (s)</Label>
              <Input type="number" min={5} value={config.verificationDelay} onChange={e => update('verificationDelay', +e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={config.proxy} onCheckedChange={v => update('proxy', v)} />
            <Label>Proxy Cloudflare</Label>
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Sauvegarde...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Sauvegarder</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
