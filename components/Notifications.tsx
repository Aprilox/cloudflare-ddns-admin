'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Save, Eye, EyeOff } from 'lucide-react'

interface NotifSettings {
  discord: boolean
  discordWebhook: string
  telegram: boolean
  telegramBotToken: string
  telegramChatId: string
}

const defaults: NotifSettings = {
  discord: false, discordWebhook: '',
  telegram: false, telegramBotToken: '', telegramChatId: ''
}

export function Notifications() {
  const [settings, setSettings] = useState<NotifSettings>(defaults)
  const [show, setShow] = useState({ discord: false, telegram: false })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(data => setSettings({
        discord: data.discord ?? false,
        discordWebhook: data.discordWebhook ?? '',
        telegram: data.telegram ?? false,
        telegramBotToken: data.telegramBotToken ?? '',
        telegramChatId: data.telegramChatId ?? ''
      }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      if (res.ok) toast({ title: "Notifications sauvegardées" })
    } catch {
      toast({ variant: "destructive", title: "Erreur" })
    }
  }

  if (loading) return <Card><CardContent className="p-8 text-center text-muted-foreground">Chargement...</CardContent></Card>

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-6">
          {/* Discord */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={settings.discord} onCheckedChange={v => setSettings(s => ({ ...s, discord: v }))} />
              <Label>Discord</Label>
            </div>
            {settings.discord && (
              <div className="relative">
                <Input
                  type={show.discord ? 'text' : 'password'}
                  placeholder="Webhook URL"
                  value={settings.discordWebhook || ''}
                  onChange={e => setSettings(s => ({ ...s, discordWebhook: e.target.value }))}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShow(s => ({ ...s, discord: !s.discord }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {show.discord ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>

          {/* Telegram */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={settings.telegram} onCheckedChange={v => setSettings(s => ({ ...s, telegram: v }))} />
              <Label>Telegram</Label>
            </div>
            {settings.telegram && (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={show.telegram ? 'text' : 'password'}
                    placeholder="Bot Token"
                    value={settings.telegramBotToken || ''}
                    onChange={e => setSettings(s => ({ ...s, telegramBotToken: e.target.value }))}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShow(s => ({ ...s, telegram: !s.telegram }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {show.telegram ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Input
                  placeholder="Chat ID"
                  value={settings.telegramChatId || ''}
                  onChange={e => setSettings(s => ({ ...s, telegramChatId: e.target.value }))}
                />
              </div>
            )}
          </div>

          <Button type="submit" className="w-full">
            <Save className="h-4 w-4 mr-2" />Sauvegarder
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
