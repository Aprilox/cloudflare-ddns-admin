import prisma from './prisma'
import { DDNSConfig } from '@prisma/client'

// =============================================
// ÉTAT LOCAL (pour le worker actif dans ce process)
// =============================================
let workerInterval: NodeJS.Timeout | null = null
let verifyInProgress = false
let currentConfig: DDNSConfig | null = null
let pendingVerification: { ip: string; count: number; oldIp: string } | null = null

// ID unique pour ce processus (évite les doublons entre hot reloads)
const PROCESS_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`
const MIN_CHECK_INTERVAL_MS = 10000 // Minimum 10 secondes entre les checks

// APIs pour vérifier l'IP (IPv4 uniquement)
const APIS = [
  { name: 'ipify', url: 'https://api4.ipify.org?format=json', get: (d: {ip:string}) => d.ip },
  { name: 'ip-api', url: 'http://ip-api.com/json', get: (d: {query:string}) => d.query },
  { name: 'ipwhois', url: 'https://ipwhois.app/json/', get: (d: {ip:string}) => d.ip },
  { name: 'ifconfig.me', url: 'https://ifconfig.me/ip', get: (d: string) => d.trim() },
  { name: 'icanhazip', url: 'https://ipv4.icanhazip.com', get: (d: string) => d.trim() },
  { name: 'wtfismyip', url: 'https://ipv4.wtfismyip.com/json', get: (d: {YourFuckingIPAddress:string}) => d.YourFuckingIPAddress },
  { name: 'httpbin', url: 'https://httpbin.org/ip', get: (d: {origin:string}) => d.origin.split(',')[0].trim() },
  { name: 'cloudflare', url: 'https://1.1.1.1/cdn-cgi/trace', get: (d: string) => { const m = d.match(/ip=([^\n]+)/); return m ? m[1] : '' } },
]

export interface IpCheckResult { api: string; ip: string | null; success: boolean; error?: string; responseTime: number }
export interface IpConsensusResult { consensusIp: string | null; confidence: number; totalApis: number; successfulApis: number; agreementCount: number; results: IpCheckResult[] }

// =============================================
// ÉTAT PERSISTANT (dans la DB)
// =============================================
async function getWorkerState(): Promise<{ isRunning: boolean; processId: string | null; lastCheckAt: Date }> {
  try {
    const state = await prisma.workerState.findFirst({ where: { id: 1 } })
    return {
      isRunning: state?.isRunning ?? false,
      processId: state?.processId ?? null,
      lastCheckAt: state?.lastCheckAt ?? new Date(0)
    }
  } catch {
    return { isRunning: false, processId: null, lastCheckAt: new Date(0) }
  }
}

async function setWorkerState(running: boolean, updateProcessId = false): Promise<void> {
  try {
    await prisma.workerState.upsert({
      where: { id: 1 },
      update: { 
        isRunning: running,
        ...(updateProcessId ? { processId: running ? PROCESS_ID : null } : {})
      },
      create: { id: 1, isRunning: running, processId: running ? PROCESS_ID : null }
    })
  } catch (e) {
    console.error('[DDNS] Erreur sauvegarde état:', e)
  }
}

// Tenter d'acquérir le verrou pour un check (retourne true si ok)
async function tryAcquireCheckLock(): Promise<boolean> {
  try {
    const state = await prisma.workerState.findFirst({ where: { id: 1 } })
    if (!state) return true // Pas d'état = OK
    
    const now = Date.now()
    const lastCheck = state.lastCheckAt.getTime()
    
    // Si le dernier check est trop récent, refuser
    if (now - lastCheck < MIN_CHECK_INTERVAL_MS) {
      console.log(`[DDNS] Check ignoré (dernier il y a ${now - lastCheck}ms)`)
      return false
    }
    
    // Mettre à jour le timestamp du dernier check
    await prisma.workerState.update({
      where: { id: 1 },
      data: { lastCheckAt: new Date() }
    })
    
    return true
  } catch {
    return false
  }
}

// =============================================
// API CHECK
// =============================================
async function checkApi(api: typeof APIS[0]): Promise<IpCheckResult> {
  const start = Date.now()
  try {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(api.url, { signal: ctrl.signal })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    
    const text = await res.text()
    let data: unknown = text
    try { data = JSON.parse(text) } catch {}
    
    const ip = api.get(data as never)?.trim()
    if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) throw new Error('Invalid IP')
    return { api: api.name, ip, success: true, responseTime: Date.now() - start }
  } catch (e) {
    return { api: api.name, ip: null, success: false, error: e instanceof Error ? e.message : 'Error', responseTime: Date.now() - start }
  }
}

export async function getPublicIpWithConsensus(): Promise<IpConsensusResult> {
  const results = await Promise.all(APIS.map(checkApi))
  const ok = results.filter(r => r.success && r.ip)
  const counts: Record<string, number> = {}
  for (const r of ok) if (r.ip) counts[r.ip] = (counts[r.ip] || 0) + 1
  
  let consensusIp: string | null = null, max = 0
  for (const [ip, c] of Object.entries(counts)) if (c > max) { max = c; consensusIp = ip }
  
  return { consensusIp, confidence: ok.length ? Math.round(max / ok.length * 100) : 0, totalApis: results.length, successfulApis: ok.length, agreementCount: max, results }
}

async function getPublicIp(): Promise<string> {
  const r = await getPublicIpWithConsensus()
  if (!r.consensusIp || r.confidence < 50 || r.agreementCount < 3)
    throw new Error(`Consensus faible: ${r.confidence}%`)
  return r.consensusIp
}

// =============================================
// CLOUDFLARE DNS
// =============================================
async function updateDNS(config: DDNSConfig, ip: string): Promise<boolean> {
  try {
    const headers = { 'Authorization': `Bearer ${config.cloudflareToken}`, 'Content-Type': 'application/json' }
    const list = await fetch(`https://api.cloudflare.com/client/v4/zones/${config.zoneId}/dns_records?type=A&name=${config.recordName}`, { headers })
    const listData = await list.json()
    if (!listData.success || !listData.result.length) return false
    
    const update = await fetch(`https://api.cloudflare.com/client/v4/zones/${config.zoneId}/dns_records/${listData.result[0].id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ type: 'A', name: config.recordName, content: ip, ttl: config.ttl, proxied: config.proxy })
    })
    return (await update.json()).success
  } catch { return false }
}

// =============================================
// LOGGING & NOTIFICATIONS
// =============================================
async function log(action: string, details: string) {
  try { await prisma.actionLog.create({ data: { action, details } }) } catch {}
}

async function notify(oldIp: string, newIp: string, ms: number) {
  const s = await prisma.notificationSettings.findFirst()
  if (!s) return
  
  const date = new Date()
  const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  
  // Message différent selon si c'est la première IP ou un changement
  const isFirst = oldIp === 'N/A'
  const msg = isFirst 
    ? `🚀 DDNS initialisé !
• IP détectée : ${newIp}
• Date : ${dateStr} ${timeStr}
• Le système de notification fonctionne ✅`
    : `🔔 Changement d'IP détecté !
• Ancienne IP : ${oldIp}
• Nouvelle IP : ${newIp}
• Durée du changement : ${ms} ms
• Date : ${dateStr} ${timeStr}`

  if (s.discord && s.discordWebhook) {
    fetch(s.discordWebhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: msg }) }).catch(() => {})
  }
  if (s.telegram && s.telegramBotToken && s.telegramChatId) {
    fetch(`https://api.telegram.org/bot${s.telegramBotToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: s.telegramChatId, text: msg })
    }).catch(() => {})
  }
}

// =============================================
// IP UPDATE PROCESS
// =============================================
async function processUpdate(newIp: string, oldIp: string, config: DDNSConfig) {
  const start = Date.now()
  const ok = await updateDNS(config, newIp)
  const ms = Date.now() - start
  if (ok) {
    await prisma.ipChangeLog.create({ data: { oldIp, newIp, changeDuration: ms } })
    await log('DNS_UPDATE_SUCCESS', `${oldIp} → ${newIp} (${ms}ms)`)
    await notify(oldIp, newIp, ms)
  } else {
    await log('DNS_UPDATE_FAILURE', `Échec: ${newIp}`)
  }
}

async function startVerification(config: DDNSConfig, newIp: string, oldIp: string) {
  if (verifyInProgress) return
  verifyInProgress = true
  pendingVerification = { ip: newIp, count: 1, oldIp }
  await log('IP_VERIFICATION_STARTED', `${newIp} (1/${config.verificationCount})`)
  
  if (config.verificationCount <= 1) {
    await processUpdate(newIp, oldIp, config)
    verifyInProgress = false
    pendingVerification = null
    return
  }
  scheduleNextVerification(config)
}

function scheduleNextVerification(config: DDNSConfig) {
  if (!pendingVerification) {
    verifyInProgress = false
    return
  }
  
  const { ip, count, oldIp } = pendingVerification
  
  setTimeout(async () => {
    const state = await getWorkerState()
    // Vérifier que le worker est actif ET que c'est notre processus
    if (!state.isRunning || state.processId !== PROCESS_ID || !pendingVerification) {
      verifyInProgress = false
      pendingVerification = null
      return
    }
    
    try {
      const current = await getPublicIp()
      const n = count + 1
      await log('IP_VERIFICATION', `${n}/${config.verificationCount}: ${current}`)
      
      if (current !== ip) {
        await log('IP_VERIFICATION_CANCELLED', `IP changée: ${ip} → ${current}`)
        verifyInProgress = false
        pendingVerification = null
        return
      }
      
      pendingVerification.count = n
      if (n >= config.verificationCount) {
        await log('IP_VERIFICATION_COMPLETED', `${ip} confirmée`)
        await processUpdate(ip, oldIp, config)
        verifyInProgress = false
        pendingVerification = null
      } else {
        scheduleNextVerification(config)
      }
    } catch (e) {
      await log('IP_VERIFICATION_ERROR', e instanceof Error ? e.message : 'Error')
      verifyInProgress = false
      pendingVerification = null
    }
  }, config.verificationDelay * 1000)
}

// =============================================
// CHECK IP PRINCIPAL
// =============================================
async function checkIP() {
  // Vérifier l'état du worker
  const state = await getWorkerState()
  if (!state.isRunning || !currentConfig) return
  if (verifyInProgress) {
    console.log('[DDNS] Check ignoré (vérification en cours)')
    return
  }
  
  // Tenter d'acquérir le verrou (évite les doubles checks)
  const canCheck = await tryAcquireCheckLock()
  if (!canCheck) return
  
  const config = currentConfig
  
  try {
    const r = await getPublicIpWithConsensus()
    if (!r.consensusIp || r.confidence < 50 || r.agreementCount < 3) {
      await log('IP_CHECK_FAILED', `Consensus: ${r.confidence}%`)
      return
    }
    
    await log('IP_CHECK', `${r.consensusIp} (${r.confidence}%, ${r.agreementCount}/${r.successfulApis})`)
    const last = await prisma.ipChangeLog.findFirst({ orderBy: { timestamp: 'desc' } })
    
    if (!last || last.newIp !== r.consensusIp) {
      // Si première IP, enregistrer et notifier (test)
      if (!last) {
        await log('FIRST_IP_RECORDED', `Première IP enregistrée: ${r.consensusIp}`)
        await prisma.ipChangeLog.create({ data: { oldIp: 'N/A', newIp: r.consensusIp, changeDuration: 0 } })
        await notify('N/A', r.consensusIp, 0)
      } else {
        await log('IP_CHANGE_DETECTED', `${last.newIp} → ${r.consensusIp}`)
        await startVerification(config, r.consensusIp, last.newIp)
      }
    } else {
      await log('NO_IP_CHANGE', r.consensusIp)
    }
  } catch (e) {
    await log('CHECK_ERROR', e instanceof Error ? e.message : 'Error')
  }
}

// =============================================
// WORKER CONTROL
// =============================================
export async function startWorker(config: DDNSConfig) {
  const state = await getWorkerState()
  if (state.isRunning && workerInterval) {
    console.log('[DDNS] Worker déjà actif')
    return
  }
  
  // Nettoyer ancien intervalle
  if (workerInterval) {
    clearInterval(workerInterval)
    workerInterval = null
  }
  
  // Marquer comme actif dans la DB avec notre processId
  await setWorkerState(true, true)
  currentConfig = config
  verifyInProgress = false
  pendingVerification = null
  
  await log('WORKER_START', `Intervalle: ${config.checkInterval}s (${PROCESS_ID.slice(0, 8)})`)
  console.log(`[DDNS] Worker démarré (check toutes les ${config.checkInterval}s) - Process ${PROCESS_ID.slice(0, 8)}`)
  
  // Premier check immédiat
  await checkIP()
  
  // Planifier les checks suivants
  workerInterval = setInterval(async () => {
    const currentState = await getWorkerState()
    // Vérifier que c'est bien notre processus qui est actif
    if (currentState.isRunning && currentState.processId === PROCESS_ID) {
      await checkIP()
    } else {
      // Un autre processus a pris le relais ou worker arrêté
      console.log(`[DDNS] Worker ${PROCESS_ID.slice(0, 8)} se désactive (processId actif: ${currentState.processId?.slice(0, 8) || 'aucun'})`)
      if (workerInterval) {
        clearInterval(workerInterval)
        workerInterval = null
      }
    }
  }, config.checkInterval * 1000)
}

export async function stopWorker() {
  const state = await getWorkerState()
  if (!state.isRunning) {
    console.log('[DDNS] Worker déjà arrêté')
    return
  }
  
  // Marquer comme arrêté dans la DB
  await setWorkerState(false, true)
  currentConfig = null
  
  // Nettoyer l'intervalle
  if (workerInterval) {
    clearInterval(workerInterval)
    workerInterval = null
  }
  
  verifyInProgress = false
  pendingVerification = null
  
  await log('WORKER_STOP', 'Arrêté')
  console.log('[DDNS] Worker arrêté')
}

export async function isWorkerRunning(): Promise<boolean> {
  const state = await getWorkerState()
  return state.isRunning
}

export async function getConfig(): Promise<DDNSConfig> {
  let c = await prisma.dDNSConfig.findFirst()
  if (!c) {
    c = await prisma.dDNSConfig.create({
      data: { id: 1, cloudflareToken: '', zoneId: '', recordName: '', ttl: 1, proxy: true, checkInterval: 300, verificationCount: 3, verificationDelay: 10 }
    })
  }
  return c
}

export async function initializeWorker() {
  const config = await getConfig()
  
  // Config incomplète = pas de worker
  if (!config.cloudflareToken || !config.zoneId || !config.recordName) {
    console.log('[DDNS] Config incomplète, worker non démarré')
    return
  }
  
  const state = await getWorkerState()
  
  // Si marqué comme actif dans la DB
  if (state.isRunning) {
    // Si c'est déjà notre processus avec un intervalle, rien à faire
    if (state.processId === PROCESS_ID && workerInterval) {
      console.log('[DDNS] Worker déjà actif dans ce processus')
      return
    }
    
    // Si un autre processus est actif, on ne fait rien (il gère)
    if (state.processId && state.processId !== PROCESS_ID) {
      console.log(`[DDNS] Worker actif dans un autre processus (${state.processId.slice(0, 8)})`)
      return
    }
    
    // Sinon, reprendre le worker (hot reload ou crash précédent)
    console.log('[DDNS] Reprise du worker après hot reload...')
    currentConfig = config
    verifyInProgress = false
    
    // Mettre à jour le processId pour ce processus
    await setWorkerState(true, true)
    
    // Check si assez de temps s'est écoulé
    await checkIP()
    
    // Puis intervalle
    workerInterval = setInterval(async () => {
      const currentState = await getWorkerState()
      if (currentState.isRunning && currentState.processId === PROCESS_ID) {
        await checkIP()
      } else {
        if (workerInterval) {
          clearInterval(workerInterval)
          workerInterval = null
        }
      }
    }, config.checkInterval * 1000)
    
    console.log(`[DDNS] Intervalle relancé (${config.checkInterval}s) - Process ${PROCESS_ID.slice(0, 8)}`)
    return
  }
  
  // Si pas actif dans la DB, démarrer normalement
  await startWorker(config)
}
