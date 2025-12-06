'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, Clock, Trash2 } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function Statistics() {
  const [stats, setStats] = useState({ totalChanges: 0, averageChangeDuration: 0 })
  const [showDialog, setShowDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats')
      if (res.ok) setStats(await res.json())
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const deleteStats = async () => {
    setDeleting(true)
    try {
      await fetch('/api/delete-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ipChangeLogs', deleteAll: true })
      })
      await fetchStats()
    } catch (e) { console.error(e) }
    setDeleting(false)
    setShowDialog(false)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Changements IP</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalChanges}</p>
            <p className="text-xs text-muted-foreground">Total enregistré</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Durée moyenne</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.averageChangeDuration.toFixed(0)}<span className="text-lg">ms</span></p>
            <p className="text-xs text-muted-foreground">Mise à jour DNS</p>
          </CardContent>
        </Card>
      </div>

      <Button variant="outline" size="sm" onClick={() => setShowDialog(true)} className="gap-2">
        <Trash2 className="h-4 w-4" />
        Réinitialiser les statistiques
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser les statistiques ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les données de changements d&apos;IP seront supprimées. Les statistiques seront remises à zéro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deleteStats} disabled={deleting}>
              {deleting ? 'Suppression...' : 'Réinitialiser'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
