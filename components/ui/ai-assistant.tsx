'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, X, Send, Loader2, ChevronDown, Bot, FileText, Copy, Check, Printer } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Suggestion {
  label: string
  message: string
}

interface Props {
  establishmentName: string
  userName: string
  chatEndpoint?: string
  contextEndpoint?: string
  mode?: 'manager' | 'employee'
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
}: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputFocused, setInputFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>(FALLBACK_SUGGESTIONS)
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sendRef = useRef<((text: string) => void) | null>(null)

  // Fetch proactive suggestions once on first open
  useEffect(() => {
    if (!open || suggestionsLoaded) return
    setSuggestionsLoaded(true)
    fetch(contextEndpoint)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.suggestions?.length) setSuggestions(data.suggestions)
      })
      .catch(() => {/* keep fallback */})
  }, [open, suggestionsLoaded, contextEndpoint])

  // Listen for external open requests (e.g. "Générer le planning" button)
  useEffect(() => {
    function handleExternalOpen(e: Event) {
      const detail = (e as CustomEvent<{ message?: string }>).detail
      setOpen(true)
      if (detail?.message) {
        // Delay so the panel opens and the greeting initialises first
        setTimeout(() => sendRef.current?.(detail.message!), 300)
      }
    }
    window.addEventListener('ai:open', handleExternalOpen)
    return () => window.removeEventListener('ai:open', handleExternalOpen)
  }, [])

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = mode === 'employee'
        ? `Bonjour ${userName.split(' ')[0]} 👋 Je suis ton assistant Nexus.\n\nJe peux t'aider à consulter tes horaires, tes congés, tes droits et répondre à tes questions RH. Comment puis-je t'aider ?`
        : `Bonjour ${userName.split(' ')[0]} 👋 Je suis votre assistant Nexus pour **${establishmentName}**.\n\nJe peux vous aider avec le planning, les employés, les documents RH, les congés et plus encore. Que puis-je faire pour vous ?`
      setMessages([{ role: 'assistant', content: greeting }])
    }
  }, [open, messages.length, userName, establishmentName, mode])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setInput('')
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
  }

  return (
    <>
      {/* Floating button — remonté au-dessus de la bottom nav sur mobile */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Assistant IA"
        className="fixed right-4 z-50 flex items-center justify-center rounded-full transition-all duration-300 focus:outline-none bottom-[80px] md:bottom-6"
        style={{
          height: '52px',
          width: '52px',
          backgroundColor: open ? 'var(--text-primary)' : 'var(--accent)',
          color: 'white',
          border: '0.5px solid var(--border)',
          transform: open ? 'scale(0.95)' : 'scale(1)',
        }}
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      {/* Chat panel */}
      <div
        className={`fixed right-4 z-50 flex flex-col rounded-2xl transition-all duration-300 w-[calc(100vw-32px)] md:w-[380px] bottom-[144px] md:bottom-24 ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{
          maxHeight: 'calc(100vh - 180px)',
          minHeight: '460px',
          border: '0.5px solid var(--border)',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between rounded-t-2xl px-4 py-3"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Assistant Nexus</p>
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
              >
                <ChevronDown className="h-4 w-4 rotate-90" />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 transition-colors"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ minHeight: 0 }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {msg.role === 'assistant' && (
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full mt-0.5"
                  style={{ backgroundColor: 'var(--accent-light)' }}
                >
                  <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
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
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: 'var(--accent-light)' }}
              >
                <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
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
        <div className="p-3" style={{ borderTop: '0.5px solid var(--border)' }}>
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
              onChange={e => setInput(e.target.value)}
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
                className="flex-shrink-0 rounded-lg p-1.5 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                title="Arrêter"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
              </button>
            ) : (
              <button
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="flex-shrink-0 rounded-lg p-1.5 transition-colors disabled:opacity-30"
                style={{ color: 'var(--accent)' }}
                title="Envoyer (Entrée)"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-1.5 text-center text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            Entrée pour envoyer · Maj+Entrée pour sauter une ligne
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

// Split message text into regular blocks and document blocks
function parseMessageBlocks(text: string): Array<{ type: 'text' | 'doc'; content: string; docType?: string }> {
  const blocks: Array<{ type: 'text' | 'doc'; content: string; docType?: string }> = []
  const docRegex = /\[DOC:([^\]]+)\]([\s\S]*?)\[\/DOC\]/g
  let lastIndex = 0
  let match

  while ((match = docRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    blocks.push({ type: 'doc', docType: match[1].trim(), content: match[2].trim() })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    blocks.push({ type: 'text', content: text.slice(lastIndex) })
  }
  return blocks.length ? blocks : [{ type: 'text', content: text }]
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

function MarkdownText({ text }: { text: string }) {
  const blocks = parseMessageBlocks(text)
  return (
    <div className="space-y-2">
      {blocks.map((block, bi) =>
        block.type === 'doc' ? (
          <DocumentCard key={bi} docType={block.docType!} content={block.content} />
        ) : (
          <div key={bi} className="space-y-1">
            {block.content.split('\n').map((line, i) => {
              const isBullet = /^[-*•]\s/.test(line)
              const processed = line
                .replace(/^[-*•]\s/, '')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/`(.+?)`/g, '<code class="bg-black/10 px-1 rounded text-[11px] font-mono">$1</code>')

              if (!processed && i > 0) return <div key={i} className="h-1" />
              return isBullet
                ? <div key={i} className="flex gap-1.5"><span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current opacity-50" /><span dangerouslySetInnerHTML={{ __html: processed }} /></div>
                : <span key={i} className="block" dangerouslySetInnerHTML={{ __html: processed }} />
            })}
          </div>
        )
      )}
    </div>
  )
}
