'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LifeBuoy, Send, Mail, Sparkles, BookOpen, Clock, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const SUPPORT_EMAIL = 'assistance.quartzbase@mail.fr'

// Catégories affichées dans le sélecteur. La valeur est reprise telle quelle
// en tête du message envoyé à /api/feedback, pour que l'opérateur trie vite.
const CATEGORIES = [
  'Question générale',
  'Problème technique',
  'Facturation & abonnement',
  'Suggestion d\'amélioration',
  'Autre',
] as const

export default function SupportPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [category, setCategory] = useState<string>(CATEGORIES[0])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  // Affiche le compte depuis lequel le message part (l'API le rattache déjà
  // côté serveur ; ici c'est purement informatif pour l'utilisateur).
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  async function submit() {
    if (message.trim().length < 5) {
      toast.error('Merci de décrire votre demande en quelques mots.')
      return
    }
    setSending(true)
    try {
      // Motif et sujet sont envoyés en champs dédiés (colonnes support_reports),
      // ce qui permet à l'opérateur de trier les signalements côté back-office.
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          category,
          subject: subject.trim() || undefined,
          url: typeof window !== 'undefined' ? window.location.href : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Envoi impossible')
      }
      toast.success('Message envoyé ! Notre équipe vous répondra rapidement.')
      setSubject('')
      setMessage('')
      setCategory(CATEGORIES[0])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Envoi impossible')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="px-4 md:px-6 py-5 max-w-4xl mx-auto">
      {/* Header — même structure que le Centre d'aide */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center">
            <LifeBuoy className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-[20px] font-medium text-[var(--text-primary)] tracking-[-0.02em]">
              Contact &amp; support
            </h1>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Une question, un souci, une idée ? Écrivez-nous, on vous répond.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
        {/* Formulaire */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <div className="space-y-4">
            <div>
              <Label htmlFor="support-category" className="text-[12.5px] text-[var(--text-secondary)]">
                Motif
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger
                  id="support-category"
                  className="mt-1.5"
                  style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="support-subject" className="text-[12.5px] text-[var(--text-secondary)]">
                Sujet <span className="text-[var(--text-tertiary)]">(optionnel)</span>
              </Label>
              <Input
                id="support-subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Ex : impossible de publier le planning"
                maxLength={120}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="support-message" className="text-[12.5px] text-[var(--text-secondary)]">
                Message
              </Label>
              <Textarea
                id="support-message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Décrivez votre demande le plus précisément possible…"
                rows={7}
                maxLength={2000}
                className="mt-1.5 resize-none"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-[12px] text-[var(--text-tertiary)] min-w-0 truncate">
                {email ? <>Envoyé depuis <span className="text-[var(--text-secondary)]">{email}</span></> : ' '}
              </p>
              <button
                onClick={submit}
                disabled={sending}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-medium text-white transition-transform active:scale-95 disabled:opacity-60 flex-shrink-0"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <Send className="h-4 w-4" />
                {sending ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>

        {/* Autres moyens de nous joindre */}
        <div className="space-y-3">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-start gap-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--accent)] transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
              <Mail className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[var(--text-primary)]">Par email</p>
              <p className="text-[12px] text-[var(--text-secondary)] truncate group-hover:text-[var(--accent)] transition-colors">
                {SUPPORT_EMAIL}
              </p>
            </div>
          </a>

          <div className="flex items-start gap-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[var(--text-primary)]">Assistant IA</p>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Réponse immédiate via la bulle en bas à droite de l&apos;écran.
              </p>
            </div>
          </div>

          <Link
            href="/manager/help"
            className="flex items-start gap-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--accent)] transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[var(--text-primary)]">Centre d&apos;aide</p>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Guides, tutoriels et questions fréquentes.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] flex-shrink-0 mt-0.5 group-hover:text-[var(--accent)] transition-colors" />
          </Link>

          <div className="flex items-center gap-2.5 px-4 py-3 text-[12px] text-[var(--text-tertiary)]">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            Réponse sous 24&nbsp;h ouvrées en moyenne.
          </div>
        </div>
      </div>
    </div>
  )
}
