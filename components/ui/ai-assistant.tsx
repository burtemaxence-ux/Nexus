'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, X, Send, Loader2, ChevronDown, Bot } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  establishmentName: string
  userName: string
}

const SUGGESTIONS = [
  'Génère le planning de la semaine prochaine',
  'Qui a le plus d\'heures ce mois-ci ?',
  'Quelles alertes légales sont actives ?',
  'Résume les congés en attente',
]

export function AiAssistant({ establishmentName, userName }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Bonjour ${userName.split(' ')[0]} 👋 Je suis votre assistant D-pot pour **${establishmentName}**.\n\nJe peux vous aider avec le planning, les employés, les rapports, les congés et plus encore. Que puis-je faire pour vous ?`,
      }])
    }
  }, [open, messages.length, userName, establishmentName])

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
      const res = await fetch('/api/ai/chat', {
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
  }, [messages, loading, establishmentName])

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
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Assistant IA"
        className={`fixed bottom-6 right-6 z-50 flex h-13 w-13 items-center justify-center rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
          open
            ? 'bg-gray-800 text-white focus:ring-gray-700 scale-95'
            : 'bg-primary text-white hover:bg-primary/90 hover:scale-110 focus:ring-primary'
        }`}
        style={{ height: '52px', width: '52px' }}
      >
        <span className={`transition-all duration-200 ${open ? 'rotate-0 scale-100' : 'rotate-0 scale-100'}`}>
          {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        </span>
      </button>

      {/* Chat panel */}
      <div
        className={`fixed bottom-24 right-6 z-50 flex w-[380px] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all duration-300 ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{ maxHeight: 'calc(100vh - 140px)', minHeight: '460px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-primary to-indigo-500 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Assistant D-pot</p>
              <p className="text-[10px] text-white/70">Propulsé par Claude</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 1 && (
              <button onClick={reset} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors" title="Nouvelle conversation">
                <ChevronDown className="h-4 w-4 rotate-90" />
              </button>
            )}
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ minHeight: 0 }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {msg.role === 'assistant' && (
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-tr-sm'
                    : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                }`}
              >
                <MarkdownText text={msg.content} />
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Suggestions (only at start) */}
          {messages.length === 1 && !loading && (
            <div className="space-y-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-600 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-primary/50 focus-within:bg-white transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Posez votre question…"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
              style={{ maxHeight: '100px' }}
            />
            {loading ? (
              <button onClick={handleStop} className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Arrêter">
                <Loader2 className="h-4 w-4 animate-spin" />
              </button>
            ) : (
              <button
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="flex-shrink-0 rounded-lg p-1.5 text-primary hover:bg-primary/10 disabled:opacity-30 transition-colors"
                title="Envoyer (Entrée)"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-1.5 text-center text-[10px] text-gray-400">Entrée pour envoyer · Maj+Entrée pour sauter une ligne</p>
        </div>
      </div>
    </>
  )
}

function MarkdownText({ text }: { text: string }) {
  // Minimal markdown: bold, italic, line breaks, bullet points
  const lines = text.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
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
}
