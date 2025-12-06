'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Save, Key, Eye, EyeOff } from 'lucide-react'

export function SettingsPanel() {
  const { toast } = useToast()
  
  // Rétention logs
  const [retention, setRetention] = useState({ ip: 30, action: 30, stats: 90 })
  
  // Mot de passe
  const [pwd, setPwd] = useState({ current: '', new: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)

  useEffect(() => {
    fetch('/api/log-settings')
      .then(r => r.json())
      .then(data => setRetention({
        ip: data.ipChangeLogRetention ?? 30,
        action: data.actionLogRetention ?? 30,
        stats: data.statisticsDataRetention ?? 90
      }))
  }, [])

  const saveRetention = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch('/api/log-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipChangeLogRetention: retention.ip,
          actionLogRetention: retention.action,
          statisticsDataRetention: retention.stats
        })
      })
      toast({ title: "Rétention mise à jour" })
    } catch {
      toast({ variant: "destructive", title: "Erreur" })
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwd.new !== pwd.confirm) {
      toast({ variant: "destructive", title: "Les mots de passe ne correspondent pas" })
      return
    }
    if (pwd.new.length < 4) {
      toast({ variant: "destructive", title: "Minimum 4 caractères" })
      return
    }
    
    setSavingPwd(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: pwd.current,
          newPassword: pwd.new,
          confirmPassword: pwd.confirm
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: "Mot de passe modifié" })
        setPwd({ current: '', new: '', confirm: '' })
      } else {
        toast({ variant: "destructive", title: data.error || "Erreur" })
      }
    } catch {
      toast({ variant: "destructive", title: "Erreur" })
    } finally {
      setSavingPwd(false)
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Rétention */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Rétention des logs (jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveRetention} className="space-y-4">
            <div className="space-y-2">
              <Label>Logs IP</Label>
              <Input type="number" min={1} value={retention.ip} 
                onChange={e => setRetention(r => ({ ...r, ip: +e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Logs Action</Label>
              <Input type="number" min={1} value={retention.action}
                onChange={e => setRetention(r => ({ ...r, action: +e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Statistiques</Label>
              <Input type="number" min={1} value={retention.stats}
                onChange={e => setRetention(r => ({ ...r, stats: +e.target.value }))} />
            </div>
            <Button type="submit" className="w-full">
              <Save className="h-4 w-4 mr-2" />Sauvegarder
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Mot de passe */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />Mot de passe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Actuel</Label>
              <div className="relative">
                <Input type={showPwd ? 'text' : 'password'} value={pwd.current}
                  onChange={e => setPwd(p => ({ ...p, current: e.target.value }))} className="pr-10" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nouveau</Label>
              <Input type={showPwd ? 'text' : 'password'} value={pwd.new}
                onChange={e => setPwd(p => ({ ...p, new: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Confirmer</Label>
              <Input type={showPwd ? 'text' : 'password'} value={pwd.confirm}
                onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} />
            </div>
            <Button type="submit" className="w-full" disabled={savingPwd}>
              <Key className="h-4 w-4 mr-2" />{savingPwd ? 'Modification...' : 'Modifier'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
