'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, ArrowRight, Clock, Eye, EyeOff, Trash2 } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface IpChange {
  id: number
  timestamp: string
  oldIp: string
  newIp: string
  changeDuration: number
}

interface ActionLog {
  id: number
  timestamp: string
  action: string
  details: string
}

const actionColors: Record<string, string> = {
  'WORKER_START': 'text-green-500',
  'WORKER_STOP': 'text-gray-500',
  'IP_CHECK': 'text-blue-400',
  'NO_IP_CHANGE': 'text-gray-400',
  'FIRST_IP_RECORDED': 'text-cyan-500',
  'IP_CHANGE_DETECTED': 'text-yellow-500',
  'IP_VERIFICATION_STARTED': 'text-orange-400',
  'IP_VERIFICATION': 'text-orange-400',
  'IP_VERIFICATION_COMPLETED': 'text-green-400',
  'IP_VERIFICATION_CANCELLED': 'text-red-400',
  'DNS_UPDATE_SUCCESS': 'text-green-500',
  'DNS_UPDATE_FAILURE': 'text-red-500',
  'CHECK_ERROR': 'text-red-500',
  'IP_CHECK_FAILED': 'text-red-400',
}

export function IpChanges() {
  const [changes, setChanges] = useState<IpChange[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [logs, setLogs] = useState<ActionLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [showIp, setShowIp] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchChanges()
    const interval = setInterval(fetchChanges, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchChanges = async () => {
    try {
      const res = await fetch('/api/logs')
      if (res.ok) setChanges(await res.json())
    } catch (e) { console.error(e) }
  }

  const fetchLogsAround = async (timestamp: string) => {
    setLoadingLogs(true)
    try {
      const res = await fetch(`/api/logs-around?timestamp=${encodeURIComponent(timestamp)}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch (e) { console.error(e) }
    setLoadingLogs(false)
  }

  const toggleExpand = (id: number, timestamp: string) => {
    if (expanded === id) {
      setExpanded(null)
      setLogs([])
    } else {
      setExpanded(id)
      fetchLogsAround(timestamp)
    }
  }

  const deleteHistory = async () => {
    setDeleting(true)
    try {
      await fetch('/api/delete-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ipChangeLogs', deleteAll: true })
      })
      await fetchChanges()
    } catch (e) { console.error(e) }
    setDeleting(false)
    setShowDialog(false)
  }

  const maskIp = (ip: string) => showIp ? ip : ip.replace(/\d+/g, '•••')
  
  const formatDate = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + 
           ' ' + d.toLocaleTimeString('fr-FR')
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Changements d&apos;IP</CardTitle>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowIp(!showIp)}>
            {showIp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowDialog(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {changes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucun changement d&apos;IP enregistré
          </p>
        ) : (
          <div className="space-y-2">
            {changes.map((change) => (
              <div key={change.id} className="border rounded-lg overflow-hidden">
                {/* Header cliquable */}
                <button
                  onClick={() => toggleExpand(change.id, change.timestamp)}
                  className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <span className="text-muted-foreground">{maskIp(change.oldIp)}</span>
                      <ArrowRight className="h-4 w-4 text-primary" />
                      <span className="font-medium">{maskIp(change.newIp)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {change.changeDuration}ms
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(change.timestamp)}
                    </span>
                    {expanded === change.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {/* Détails expandés */}
                {expanded === change.id && (
                  <div className="border-t bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Logs ±30 secondes autour du changement
                    </p>
                    
                    {loadingLogs ? (
                      <p className="text-sm text-muted-foreground">Chargement...</p>
                    ) : logs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun log trouvé</p>
                    ) : (
                      <div className="space-y-1 max-h-64 overflow-auto">
                        {logs.map((log) => (
                          <div 
                            key={log.id} 
                            className="flex items-start gap-2 text-xs py-1 px-2 rounded hover:bg-muted/50"
                          >
                            <span className="text-muted-foreground whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                            </span>
                            <span className={`font-medium whitespace-nowrap ${actionColors[log.action] || ''}`}>
                              {log.action}
                            </span>
                            <span className="text-muted-foreground truncate">
                              {showIp ? log.details : log.details.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '•••.•••.•••.•••')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;historique ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les changements d&apos;IP enregistrés seront supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deleteHistory} disabled={deleting}>
              {deleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

