'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import { useToast } from "@/hooks/use-toast"
import { 
  LogOut, Play, Square, Activity, Settings, Bell, 
  FileText, BarChart3, Wifi, RefreshCw, History
} from 'lucide-react'

// Composants
import { IpChecker } from '@/components/IpChecker'
import { IpChanges } from '@/components/IpChanges'
import { ActionLogs } from '@/components/ActionLogs'
import { DDNSConfig } from '@/components/DDNSConfig'
import { Notifications } from '@/components/Notifications'
import { SettingsPanel } from '@/components/Settings'
import { Statistics } from '@/components/Statistics'

export default function Dashboard() {
  const [status, setStatus] = useState<'running' | 'stopped' | 'error'>('stopped')
  const [loading, setLoading] = useState(false)
  const [init, setInit] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ddns-worker?action=status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data.status)
      }
    } catch (e) {
      console.error('Status check failed:', e)
    }
  }, [])

  const toggleWorker = async () => {
    setLoading(true)
    try {
      const action = status === 'running' ? 'stop' : 'start'
      const res = await fetch(`/api/ddns-worker?action=${action}`)
      if (res.ok) {
        const data = await res.json()
        setStatus(data.status)
        toast({ title: data.message })
      }
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Action impossible" })
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  useEffect(() => {
    const initialize = async () => {
      await fetch('/api/init')
      await checkStatus()
      setInit(false)
    }
    initialize()
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [checkStatus])

  const statusColor = status === 'running' ? 'bg-success' : status === 'error' ? 'bg-destructive' : 'bg-muted-foreground'
  const statusText = status === 'running' ? 'Actif' : status === 'error' ? 'Erreur' : 'Arrêté'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-primary" />
            <span className="font-semibold">DDNS Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Status Card */}
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${statusColor} ${init ? 'animate-pulse' : ''}`} />
              <div>
                <p className="font-medium">Worker DDNS</p>
                <p className="text-sm text-muted-foreground">
                  {init ? 'Initialisation...' : statusText}
                </p>
              </div>
            </div>
            <Button 
              onClick={toggleWorker} 
              disabled={loading || init}
              variant={status === 'running' ? 'destructive' : 'default'}
              size="sm"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : status === 'running' ? (
                <><Square className="h-4 w-4 mr-2" />Arrêter</>
              ) : (
                <><Play className="h-4 w-4 mr-2" />Démarrer</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="ip" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="ip" className="gap-1">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Diagnostic</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Historique</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Logs</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1">
              <Wifi className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Config</span>
            </TabsTrigger>
            <TabsTrigger value="notif" className="gap-1">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Notifs</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Options</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ip"><IpChecker /></TabsContent>
          <TabsContent value="history"><IpChanges /></TabsContent>
          <TabsContent value="logs"><ActionLogs /></TabsContent>
          <TabsContent value="stats"><Statistics /></TabsContent>
          <TabsContent value="config"><DDNSConfig /></TabsContent>
          <TabsContent value="notif"><Notifications /></TabsContent>
          <TabsContent value="settings"><SettingsPanel /></TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
