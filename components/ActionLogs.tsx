'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Eye, EyeOff } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Log {
  id: number
  action: string
  details: string
  timestamp: string
}

const colors: Record<string, string> = {
  'WORKER_START': 'text-green-500',
  'WORKER_STOP': 'text-gray-500',
  'WORKER_NOT_STARTED': 'text-yellow-500',
  'IP_CHECK': 'text-blue-400',
  'IP_CHECK_FAILED': 'text-red-400',
  'NO_IP_CHANGE': 'text-gray-400',
  'FIRST_IP_RECORDED': 'text-cyan-500',
  'IP_CHANGE_DETECTED': 'text-yellow-500',
  'IP_VERIFICATION_STARTED': 'text-orange-400',
  'IP_VERIFICATION': 'text-orange-400',
  'IP_VERIFICATION_COMPLETED': 'text-green-400',
  'IP_VERIFICATION_CANCELLED': 'text-red-400',
  'IP_VERIFICATION_ERROR': 'text-red-500',
  'DNS_UPDATE_SUCCESS': 'text-green-500',
  'DNS_UPDATE_FAILURE': 'text-red-500',
  'CHECK_ERROR': 'text-red-500',
}

export function ActionLogs() {
  const [logs, setLogs] = useState<Log[]>([])
  const [showIp, setShowIp] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  const fetch_logs = useCallback(async () => {
    try {
      const res = await fetch('/api/action-logs')
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || data)
      }
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    fetch_logs()
    const i = setInterval(fetch_logs, 5000)
    return () => clearInterval(i)
  }, [fetch_logs])

  const deleteLogs = async () => {
    setDeleting(true)
    try {
      await fetch('/api/delete-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'actionLogs', deleteAll: true })
      })
      await fetch_logs()
    } catch (e) { console.error(e) }
    setDeleting(false)
    setShowDialog(false)
  }

  const mask = (text: string) => {
    if (showIp) return text
    return text.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '•••.•••.•••.•••')
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Action Logs</CardTitle>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowIp(!showIp)}>
            {showIp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowDialog(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-auto space-y-1">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun log</p>
          ) : logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 py-2 px-2 rounded hover:bg-muted/50 text-sm">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
              </span>
              <span className={`font-medium whitespace-nowrap ${colors[log.action] || ''}`}>
                {log.action}
              </span>
              <span className="text-muted-foreground truncate">
                {mask(log.details)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer tous les logs ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deleteLogs} disabled={deleting}>
              {deleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
