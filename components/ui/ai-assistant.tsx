'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X, Send, Loader2, RotateCcw, FileText, Copy, Check, Printer, CalendarCheck, CalendarX, CalendarPlus, UserPlus, CopyPlus, ArrowLeftRight, type LucideIcon } from 'lucide-react'
import { QuartzBot } from '@/components/ui/quartz-bot-icon'
import { AiQuotaBadge } from '@/components/ui/ai-quota-badge'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Suggestion {
  label: string
  message: string
}

// Renvoyé par /api/ai/context (mode manager) en plus des suggestions — sert
// à choisir le message de la bulle contextuelle affichée bulle fermée.
interface BubbleContext {
  sousEffectif: number
  planningPublie: boolean
  nouveauCollaborateur: boolean
}

interface Props {
  establishmentName: string
  userName: string
  chatEndpoint?: string
  contextEndpoint?: string
  mode?: 'manager' | 'employee'
  pendingLeavesCount?: number
  alertesLegalesCount?: number
}

const NINA_GRADIENT = 'linear-gradient(135deg, #7C5CFC 0%, #B14BEB 50%, #F0629A 100%)'

function partOfDay(d: Date): 'matin' | 'apres-midi' | 'soir' {
  const h = d.getHours()
  if (h < 12) return 'matin'
  if (h < 18) return 'apres-midi'
  return 'soir'
}

function isFinDeMois(d: Date): boolean {
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return lastDay - d.getDate() <= 3
}

// Message de la bulle de salut — un seul message, le premier dont la
// condition est vraie, par priorité décroissante (voir handoff Nina §6).
function buildBubbleMessage(p: {
  prenom: string
  premiereVisite: boolean
  retourAbsenceJours: number
  alertesLegales: number
  sousEffectif: number
  congesEnAttente: number
  planningPublie: boolean
  nouveauCollaborateur: boolean
  quotaRestant: number | null
  now: Date
}): string {
  const { prenom } = p
  if (p.premiereVisite) {
    return `Bonjour ${prenom}, moi c'est Nina. On prend deux minutes pour configurer votre première semaine ensemble ?`
  }
  if (p.retourAbsenceJours >= 2) {
    return `Content de vous revoir, ${prenom}. J'ai gardé un œil sur tout — je vous fais le résumé de ce qui a bougé quand vous voulez.`
  }
  if (p.alertesLegales > 0) {
    return `${prenom}, un petit point de vigilance sur les temps de repos cette semaine. Rien de grave, mais autant le régler ensemble maintenant.`
  }
  if (p.sousEffectif > 0) {
    return `${prenom}, il reste ${p.sousEffectif} créneau(x) sans personne cette semaine. Je vous propose des remplaçants dès que vous êtes dispo.`
  }
  if (p.congesEnAttente > 0) {
    return `${prenom}, ${p.congesEnAttente} demande(s) de congé attendent votre feu vert. Je m'en occupe dès que vous me le dites.`
  }
  const dow = p.now.getDay() // 5 = vendredi, 6 = samedi
  if (!p.planningPublie && (dow === 5 || dow === 6)) {
    return `${prenom}, le planning de la semaine prochaine n'est pas encore publié. On le boucle en deux minutes si vous voulez.`
  }
  if (p.nouveauCollaborateur) {
    return `${prenom}, un nouvel arrivant rejoint l'équipe. Je peux préparer son contrat et ses accès pendant que vous soufflez.`
  }
  if (isFinDeMois(p.now)) {
    return `${prenom}, c'est bientôt la clôture du mois. Je prépare les exports de paie dès que vous me donnez le top.`
  }
  if (p.quotaRestant !== null && p.quotaRestant <= 3) {
    return `${prenom}, il me reste quelques échanges ce mois-ci — gardons-les pour l'essentiel. Je reste à côté.`
  }
  const moment = partOfDay(p.now)
  if (moment === 'matin') return `Bonjour ${prenom}, belle journée qui commence. Tout est carré de mon côté, je reste dans le coin.`
  if (moment === 'apres-midi') return `${prenom}, tout roule de mon côté. Je reste juste à côté si vous avez besoin d'un coup de main.`
  return `Bonne fin de journée, ${prenom}. Rien d'urgent ce soir — je veille, filez tranquille.`
}

const FALLBACK_SUGGESTIONS: Suggestion[] = [
  { label: '📅 Générer le planning de la semaine', message: 'Génère le planning optimisé pour la semaine prochaine.' },
  { label: "📊 Résumé RH de la semaine", message: "Fais-moi un résumé RH de cette semaine : présences, retards, heures." },
  { label: '⚖️ Vérifier les alertes légales', message: 'Y a-t-il des alertes légales à traiter cette semaine ?' },
]

export function AiAssistant({
  establishmentName,
  userName,
  chatEndpoint = '/api/ai/chat',
  contextEndpoint = '/api/ai/context',
  mode = 'manager',
  pendingLeavesCount = 0,
  alertesLegalesCount = 0,
}: Props) {
  const [open, setOpen] = useState(false)
  // Le panneau reste monté et joue qzPanelOut pendant la fermeture, avant de
  // repasser complètement caché (et de laisser réapparaître la bulle Nina).
  const [closingAnim, setClosingAnim] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputFocused, setInputFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>(FALLBACK_SUGGESTIONS)
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false)
  const [bubbleContext, setBubbleContext] = useState<BubbleContext | null>(null)
  const [bubbleDismissed, setBubbleDismissed] = useState(false)
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null)
  const [visitState, setVisitState] = useState({ premiereVisite: false, retourAbsenceJours: 0 })
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sendRef = useRef<((text: string) => void) | null>(null)
  const storageKey = `qb-chat:${mode}:${establishmentName}`
  const panelVisible = open || closingAnim

  // Restore a previous conversation on mount so refresh/navigation doesn't lose it.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as Message[]
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed)
      }
    } catch { /* ignore corrupt storage */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist the conversation (cap to the last 40 messages).
  useEffect(() => {
    try {
      if (messages.length) localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)))
    } catch { /* ignore quota errors */ }
  }, [messages, storageKey])

  // Fetch proactive suggestions + bubble context once on mount (pas seulement
  // à l'ouverture : la bulle de salut Nina doit s'afficher panneau fermé).
  useEffect(() => {
    if (suggestionsLoaded) return
    setSuggestionsLoaded(true)
    fetch(contextEndpoint)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.suggestions?.length) setSuggestions(data.suggestions)
        if (data?.bubble) setBubbleContext(data.bubble)
      })
      .catch(() => {/* keep fallback */})
  }, [suggestionsLoaded, contextEndpoint])

  // Quota IA (manager uniquement) — alimente la bulle « quota bientôt épuisé ».
  useEffect(() => {
    if (mode !== 'manager') return
    fetch('/api/ai/quota')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setQuota({ used: data.used, limit: data.limit }) })
      .catch(() => {/* pas de bulle quota si indisponible */})
  }, [mode])

  // Première visite / retour après absence — dérivés d'un horodatage local
  // (manager uniquement, sert la bulle de salut contextuelle).
  useEffect(() => {
    if (mode !== 'manager') return
    const key = `qb-lastseen:${establishmentName}`
    try {
      const raw = localStorage.getItem(key)
      const now = Date.now()
      if (!raw) {
        setVisitState({ premiereVisite: true, retourAbsenceJours: 0 })
      } else {
        const days = Math.floor((now - parseInt(raw, 10)) / 86400000)
        setVisitState({ premiereVisite: false, retourAbsenceJours: days })
      }
      localStorage.setItem(key, String(now))
    } catch { /* ignore */ }
  }, [mode, establishmentName])

  // Listen for external open requests (e.g. "Générer le planning" button)
  useEffect(() => {
    function handleExternalOpen(e: Event) {
      const detail = (e as CustomEvent<{ message?: string }>).detail
      openPanel()
      if (detail?.message) {
        // Delay so the panel opens and the greeting initialises first
        setTimeout(() => sendRef.current?.(detail.message!), 300)
      }
    }
    window.addEventListener('ai:open', handleExternalOpen)
    return () => window.removeEventListener('ai:open', handleExternalOpen)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Échap referme l'assistant quand il est ouvert.
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current) }, [])

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = mode === 'employee'
        ? `Bonjour ${userName.split(' ')[0]} 👋 Je suis ton assistant Quartzbase.\n\nJe peux t'aider à consulter tes horaires, tes congés, tes droits et répondre à tes questions RH. Comment puis-je t'aider ?`
        : `Bonjour ${userName.split(' ')[0]} 👋 Je suis votre assistant Quartzbase pour **${establishmentName}**.\n\nJe peux vous aider avec le planning, les employés, les documents RH, les congés et plus encore. Que puis-je faire pour vous ?`
      setMessages([{ role: 'assistant', content: greeting }])
    }
  }, [open, messages.length, userName, establishmentName, mode])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setError(null)
    const newMessages: Message[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(newMessages)
    setLoading(true)

    abortRef.current = new AbortController()

    try {
      const res = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, establishmentName }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Erreur ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Stream indisponible')

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      const decoder = new TextDecoder()
      let done = false
      while (!done) {
        const { value, done: d } = await reader.read()
        done = d
        if (value) {
          const chunk = decoder.decode(value)
          setMessages(prev => {
            const last = prev[prev.length - 1]
            return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
          })
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }, [messages, loading, establishmentName, chatEndpoint])

  // Keep sendRef current so the external event handler can call it
  useEffect(() => { sendRef.current = send }, [send])

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    setLoading(false)
  }

  function reset() {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
    setLoading(false)
    try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`
  }

  function openPanel() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    setClosingAnim(false)
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) { setClosingAnim(false); return }
    setClosingAnim(true)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => setClosingAnim(false), 430)
  }

  function handleToggle() {
    if (open) handleClose()
    else openPanel()
  }

  // True once the first token of the assistant reply has arrived (a growing
  // assistant bubble exists) — used to switch from "…" dots to a typing caret.
  const streaming = loading && messages.length > 0 && messages[messages.length - 1].role === 'assistant'

  const bubbleMessage = useMemo(() => {
    if (mode !== 'manager' || !bubbleContext) return null
    return buildBubbleMessage({
      prenom: userName.split(' ')[0] || 'vous',
      premiereVisite: visitState.premiereVisite,
      retourAbsenceJours: visitState.retourAbsenceJours,
      alertesLegales: alertesLegalesCount,
      sousEffectif: bubbleContext.sousEffectif,
      congesEnAttente: pendingLeavesCount,
      planningPublie: bubbleContext.planningPublie,
      nouveauCollaborateur: bubbleContext.nouveauCollaborateur,
      quotaRestant: quota && quota.limit > 0 ? quota.limit - quota.used : null,
      now: new Date(),
    })
  }, [mode, bubbleContext, visitState, alertesLegalesCount, pendingLeavesCount, quota, userName])

  // La bulle de salut s'efface toute seule après quelques secondes pour ne
  // pas rester en permanence devant le contenu.
  useEffect(() => {
    if (!bubbleMessage) return
    setBubbleDismissed(false)
    const timer = setTimeout(() => setBubbleDismissed(true), 12000)
    return () => clearTimeout(timer)
  }, [bubbleMessage])

  const showGreetingBubble = mode === 'manager' && !panelVisible && !!bubbleMessage && !bubbleDismissed

  return (
    <>
      {/* Bulle de salut contextuelle Nina — visible uniquement panneau fermé */}
      {showGreetingBubble && (
        <button
          onClick={openPanel}
          className="qz-bubble-in fixed right-4 z-50 max-w-[248px] rounded-2xl rounded-br-md px-3.5 py-2.5 text-left text-[12.5px] leading-snug shadow-lg bottom-[144px] md:bottom-[88px]"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '0.5px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          {bubbleMessage}
        </button>
      )}

      {/* Floating button — remonté au-dessus de la bottom nav sur mobile */}
      <button
        onClick={handleToggle}
        aria-label={open ? "Fermer l'assistant Nina" : 'Ouvrir l’assistant Nina'}
        aria-expanded={open}
        className="fixed right-4 z-50 flex items-center justify-center rounded-full transition-transform duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white bottom-[80px] md:bottom-6"
        style={{
          height: '52px',
          width: '52px',
          background: NINA_GRADIENT,
          color: 'white',
          border: '0.5px solid var(--border)',
          transform: open ? 'scale(0.95)' : 'scale(1)',
        }}
      >
        {!open && <span className="qz-pulse-ring" aria-hidden="true" />}
        <span className="qz-float inline-flex">
          {open ? <X className="h-5 w-5" /> : <QuartzBot className="h-5 w-5" />}
        </span>
      </button>

      {/* Chat panel */}
      <div
        role="dialog"
        aria-label="Assistant Nina"
        aria-hidden={!panelVisible}
        className={[
          'fixed z-50 flex flex-col overflow-hidden inset-0 rounded-none',
          'min-[480px]:max-md:inset-auto min-[480px]:max-md:right-3 min-[480px]:max-md:bottom-3',
          'min-[480px]:max-md:w-[min(452px,calc(100vw-24px))] min-[480px]:max-md:h-[min(640px,calc(100dvh-24px))] min-[480px]:max-md:rounded-[26px]',
          'md:inset-auto md:right-6 md:bottom-6 md:w-[min(452px,calc(100vw-48px))] md:h-[min(640px,calc(100dvh-48px))] md:rounded-[26px]',
          panelVisible ? (open ? 'qz-panel-in' : 'qz-panel-out') : 'opacity-0 pointer-events-none',
        ].join(' ')}
        style={{
          border: '0.5px solid var(--border)',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ background: NINA_GRADIENT }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="qz-float relative flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <span className="qz-halo" aria-hidden="true" />
              <QuartzBot className="relative h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-syne)' }}>Nina</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.7)' }}>Propulsé par Claude</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 1 && (
              <button
                onClick={reset}
                className="rounded-lg p-1.5 transition-colors"
                style={{ color: 'rgba(255,255,255,0.7)' }}
                title="Nouvelle conversation"
                aria-label="Nouvelle conversation"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 transition-colors"
              style={{ color: 'rgba(255,255,255,0.7)' }}
              title="Fermer"
              aria-label="Fermer l'assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {mode === 'manager' && (
          <div
            className="flex items-center justify-center px-3 py-1.5"
            style={{ borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}
          >
            <AiQuotaBadge />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ minHeight: 0 }} role="log" aria-live="polite" aria-atomic="false">
          {messages.map((msg, i) => (
            <div key={i} className={`qz-msg-in flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {msg.role === 'assistant' && (
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full mt-0.5"
                  style={{ background: 'linear-gradient(135deg, rgba(124,92,252,0.16), rgba(240,98,154,0.16))' }}
                >
                  <QuartzBot className="h-3.5 w-3.5" style={{ color: '#B14BEB' }} />
                </div>
              )}
              <div
                className="max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed"
                style={msg.role === 'user'
                  ? { backgroundColor: 'var(--accent)', color: 'white', borderRadius: '1rem 1rem 0.25rem 1rem' }
                  : { backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', borderRadius: '1rem 1rem 1rem 0.25rem' }
                }
              >
                <MarkdownText text={msg.content} />
                {streaming && i === messages.length - 1 && msg.role === 'assistant' && (
                  <span
                    className="inline-block w-[2px] h-3.5 ml-0.5 align-middle animate-pulse"
                    style={{ backgroundColor: 'var(--text-secondary)' }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>
          ))}

          {loading && !streaming && (
            <div className="qz-msg-in flex gap-2.5">
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: 'linear-gradient(135deg, rgba(124,92,252,0.16), rgba(240,98,154,0.16))' }}
              >
                <QuartzBot className="h-3.5 w-3.5" style={{ color: '#B14BEB' }} />
              </div>
              <div
                className="flex items-center gap-1 px-4 py-3"
                style={{ backgroundColor: 'var(--bg-page)', borderRadius: '1rem 1rem 1rem 0.25rem' }}
              >
                <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--text-secondary)', animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--text-secondary)', animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--text-secondary)', animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {error && (
            <div
              className="rounded-lg px-3 py-2 text-xs"
              style={{ border: '0.5px solid var(--danger)', backgroundColor: '#FEE2E2', color: 'var(--danger)' }}
            >
              {error}
            </div>
          )}

          {/* Suggestions proactives (uniquement au démarrage) */}
          {messages.length === 1 && !loading && (
            <div className="space-y-2 pt-1">
              {suggestions.map((s) => (
                <SuggestionBtn key={s.label} label={s.label} onPress={() => send(s.message)} />
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3" style={{ borderTop: '0.5px solid var(--border)', paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          <div
            className="flex items-end gap-2 rounded-xl px-3 py-2 transition-colors duration-150"
            style={{
              border: inputFocused ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
              backgroundColor: inputFocused ? 'var(--bg-card)' : 'var(--bg-page)',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKey}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Posez votre question…"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm focus:outline-none"
              style={{ color: 'var(--text-primary)', maxHeight: '100px' }}
            />
            {loading ? (
              <button
                onClick={handleStop}
                className="flex h-11 w-11 md:h-8 md:w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                title="Arrêter"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
              </button>
            ) : (
              <button
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="flex h-11 w-11 md:h-8 md:w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-30"
                style={{ color: 'var(--accent)' }}
                title="Envoyer (Entrée)"
                aria-label="Envoyer le message"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-1.5 text-center text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            Entrée pour envoyer · Maj+Entrée pour sauter une ligne
          </p>
          <p className="mt-0.5 text-center text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            L&apos;assistant peut se tromper — vérifiez les informations importantes.
          </p>
        </div>
      </div>
    </>
  )
}

function SuggestionBtn({ label, onPress }: { label: string; onPress: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full rounded-xl px-3 py-2 text-left text-xs transition-colors duration-150"
      style={{
        border: hovered ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
        backgroundColor: hovered ? 'var(--accent-light)' : 'var(--bg-card)',
        color: hovered ? 'var(--accent)' : 'var(--text-secondary)',
      }}
    >
      {label}
    </button>
  )
}

type ParsedBlock =
  | { type: 'text'; content: string }
  | { type: 'doc'; tag: string; content: string }
  | { type: 'action'; tag: string; content: string }

// Split message text into plain text, [DOC:…] and [ACTION:…] blocks.
function parseMessageBlocks(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = []
  const regex = /\[(DOC|ACTION):([^\]]+)\]([\s\S]*?)\[\/\1\]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    const kind = match[1] === 'DOC' ? 'doc' : 'action'
    blocks.push({ type: kind, tag: match[2].trim(), content: match[3].trim() })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    blocks.push({ type: 'text', content: text.slice(lastIndex) })
  }
  return blocks.length ? blocks : [{ type: 'text', content: text }]
}

type ActionParams = Record<string, unknown>

// Confirmable actions the assistant can propose. Nothing runs without a click.
// `build` validates the params and returns the API request, or null if invalid.
// `details` surfaces parsed fields on the card for sensitive actions, so the
// manager confirms the real target (e.g. the email) and not just a label.
const ACTION_CONFIG: Record<string, {
  verb: string
  confirmLabel: string
  doneLabel: string
  icon: LucideIcon
  danger?: boolean
  build: (p: ActionParams) => { url: string; method: string; body: unknown } | null
  details?: (p: ActionParams) => { label: string; value: string }[]
}> = {
  approve_leave: {
    verb: 'Valider la demande de congé',
    confirmLabel: 'Valider',
    doneLabel: 'Congé validé',
    icon: CalendarCheck,
    build: (p) => p.id ? { url: `/api/conges/${p.id}`, method: 'PATCH', body: { status: 'approved' } } : null,
  },
  reject_leave: {
    verb: 'Refuser la demande de congé',
    confirmLabel: 'Refuser',
    doneLabel: 'Congé refusé',
    icon: CalendarX,
    danger: true,
    build: (p) => p.id ? { url: `/api/conges/${p.id}`, method: 'PATCH', body: { status: 'rejected' } } : null,
  },
  create_shift: {
    verb: 'Créer le créneau (brouillon)',
    confirmLabel: 'Créer',
    doneLabel: 'Créneau créé',
    icon: CalendarPlus,
    build: (p) => (p.employee_id && p.date && p.start_time && p.end_time)
      ? {
          url: '/api/shifts',
          method: 'POST',
          body: {
            employee_id: p.employee_id,
            date: p.date,
            start_time: p.start_time,
            end_time: p.end_time,
            break_minutes: p.break_minutes ?? 0,
            poste_id: p.poste_id ?? null,
            status: 'draft',
          },
        }
      : null,
  },
  approve_exchange: {
    verb: 'Valider l\'échange de shift',
    confirmLabel: 'Valider',
    doneLabel: 'Échange validé',
    icon: ArrowLeftRight,
    build: (p) => p.id ? { url: `/api/exchanges/${p.id}/approve`, method: 'POST', body: {} } : null,
  },
  reject_exchange: {
    verb: 'Refuser l\'échange de shift',
    confirmLabel: 'Refuser',
    doneLabel: 'Échange refusé',
    icon: ArrowLeftRight,
    danger: true,
    build: (p) => p.id ? { url: `/api/exchanges/${p.id}/reject`, method: 'POST', body: {} } : null,
  },
  invite_employee: {
    verb: 'Inviter un employé',
    confirmLabel: 'Inviter',
    doneLabel: 'Invitation envoyée',
    icon: UserPlus,
    build: (p) => (p.first_name && p.last_name && p.email)
      ? {
          url: '/api/employees/invite',
          method: 'POST',
          body: {
            first_name: p.first_name,
            last_name: p.last_name,
            email: p.email,
            role: p.role ?? 'employee',
            ...(p.position ? { position: p.position } : {}),
          },
        }
      : null,
    details: (p) => [
      { label: 'Email', value: String(p.email ?? '') },
      { label: 'Rôle', value: p.role === 'manager' ? 'Manager' : p.role === 'supervisor' ? 'Superviseur' : 'Employé' },
    ],
  },
  copy_week: {
    verb: 'Copier la semaine vers la suivante',
    confirmLabel: 'Copier',
    doneLabel: 'Semaine copiée',
    icon: CopyPlus,
    build: (p) => (typeof p.from_monday === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.from_monday))
      ? { url: '/api/shifts/copy-week', method: 'POST', body: { from_monday: p.from_monday } }
      : null,
    details: (p) => [{ label: 'Semaine source (lundi)', value: String(p.from_monday ?? '') }],
  },
}

function ActionCard({ tag, content }: { tag: string; content: string }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  const cfg = ACTION_CONFIG[tag]
  let parsed: ActionParams = {}
  try { parsed = JSON.parse(content) } catch { /* malformed → handled below */ }

  const request = cfg?.build(parsed) ?? null
  // Unknown action or invalid params → render nothing (never execute on bad input).
  if (!cfg || !request) return null

  const label = typeof parsed.label === 'string' ? parsed.label : undefined
  const details = cfg.details?.(parsed) ?? []
  const Icon = cfg.icon
  const accent = cfg.danger ? 'var(--danger)' : 'var(--accent)'

  async function run() {
    setState('loading'); setErrMsg('')
    try {
      const res = await fetch(request!.url, {
        method: request!.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request!.body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `Erreur ${res.status}`)
      }
      setState('done')
      router.refresh()
    } catch (e) {
      setState('error'); setErrMsg(e instanceof Error ? e.message : 'Erreur')
    }
  }

  return (
    <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', borderLeft: `2px solid ${accent}` }}>
      <div className="px-3 py-2.5" style={{ backgroundColor: 'var(--bg-page)' }}>
        <div className="flex items-start gap-2">
          <span className="flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-md" style={{ backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}>
            <Icon className="h-3 w-3" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{cfg.verb}</p>
            {label && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>}
          </div>
        </div>

        {details.length > 0 && (
          <dl className="mt-2 space-y-0.5">
            {details.map((d) => (
              <div key={d.label} className="flex gap-1.5 text-[11px]">
                <dt className="flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>{d.label} :</dt>
                <dd className="min-w-0 truncate font-medium" style={{ color: 'var(--text-secondary)' }}>{d.value || '—'}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-2">
          {state === 'done' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--success)' }}>
              <Check className="h-3 w-3" /> {cfg.doneLabel}
            </span>
          ) : (
            <button
              onClick={run}
              disabled={state === 'loading'}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-opacity disabled:opacity-50"
              style={{ backgroundColor: accent, color: 'white' }}
            >
              {state === 'loading' && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
              {state === 'error' ? 'Réessayer' : state === 'loading' ? 'En cours…' : cfg.confirmLabel}
            </button>
          )}
          {state === 'error' && <p className="text-[11px] mt-1" style={{ color: 'var(--danger)' }}>{errMsg}</p>}
        </div>
      </div>
    </div>
  )
}

function DocumentCard({ docType, content }: { docType: string; content: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handlePrint() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${docType}</title>
    <style>body{font-family:Georgia,serif;max-width:700px;margin:60px auto;font-size:14px;line-height:1.7;color:#111}
    h1{font-size:16px;text-align:center;margin-bottom:32px;text-transform:uppercase;letter-spacing:1px}
    pre{white-space:pre-wrap;font-family:inherit}@media print{body{margin:20mm}}</style>
    </head><body><pre>${content.replace(/</g, '&lt;')}</pre></body></html>`)
    win.document.close()
    win.print()
  }

  return (
    <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)' }}>
      {/* Document header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: 'var(--accent-light)', borderBottom: '0.5px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{docType}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] transition-colors"
            style={{ backgroundColor: copied ? 'var(--accent)' : 'transparent', color: copied ? 'white' : 'var(--accent)', border: '0.5px solid var(--accent)' }}
            title="Copier le document"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copié !' : 'Copier'}
          </button>
          <button
            onClick={handlePrint}
            className="rounded-lg p-1 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Imprimer / PDF"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {/* Document body */}
      <pre className="px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', maxHeight: '280px', overflowY: 'auto' }}>
        {content}
      </pre>
    </div>
  )
}

// Minimal styling for AI markdown, themed to the chat bubble.
const MD_COMPONENTS: Components = {
  p: (props) => <p className="mb-1.5 last:mb-0" {...props} />,
  ul: (props) => <ul className="list-disc pl-4 space-y-0.5 mb-1.5 last:mb-0" {...props} />,
  ol: (props) => <ol className="list-decimal pl-4 space-y-0.5 mb-1.5 last:mb-0" {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
  code: (props) => <code className="bg-black/10 px-1 rounded text-[11px] font-mono" {...props} />,
  a: (props) => <a className="underline" target="_blank" rel="noopener noreferrer" {...props} />,
}

// Renders an AI message: custom [DOC:…] blocks become DocumentCards, the rest is
// markdown rendered through react-markdown + rehype-sanitize (no raw HTML, no XSS).
export function MarkdownText({ text }: { text: string }) {
  const blocks = parseMessageBlocks(text)
  return (
    <div className="space-y-2">
      {blocks.map((block, bi) => {
        if (block.type === 'doc') return <DocumentCard key={bi} docType={block.tag} content={block.content} />
        if (block.type === 'action') return <ActionCard key={bi} tag={block.tag} content={block.content} />
        return (
          <ReactMarkdown
            key={bi}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={MD_COMPONENTS}
          >
            {block.content}
          </ReactMarkdown>
        )
      })}
    </div>
  )
}
