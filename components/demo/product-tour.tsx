'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, X, Check } from 'lucide-react'

export interface TourStep {
  /** Route à ouvrir avant de jouer l'étape. Omise = page courante. */
  route?: string
  /** Élément réel à mettre en lumière. Omis = étape centrée, sans cible. */
  selector?: string
  title: string
  body: string
  /** Ligne de conclusion, mise en avant — l'argument à retenir. */
  takeaway?: string
  /** Marge du halo autour de la cible, en pixels. */
  pad?: number
}

interface Props {
  steps: TourStep[]
  onClose: () => void
  onFinish: () => void
}

const EASE = 'cubic-bezier(.32,.72,0,1)'
const SCRIM = 'rgba(9,11,20,.72)'
// Une étape sans cible présente un écran entier plutôt qu'un élément : le voile
// s'allège pour qu'on voie l'écran dont il est question, au lieu de le masquer.
const SCRIM_SOFT = 'rgba(9,11,20,.46)'

type Box = { top: number; left: number; width: number; height: number }

/**
 * Visite guidée du produit — surlignage de l'élément réel, bulle ancrée, et
 * transitions continues d'une étape à l'autre, y compris entre les pages.
 *
 * Le composant est monté dans app-shell, qui enveloppe toutes les pages du
 * tableau de bord : la navigation ne le démonte pas, l'état du parcours
 * traverse donc les écrans sans avoir à être reconstruit.
 */
export function ProductTour({ steps, onClose, onFinish }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [index, setIndex] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const [visible, setVisible] = useState(false)
  const [settling, setSettling] = useState(true)
  // Le composant est rendu côté serveur avant hydratation : toute lecture de
  // `window` doit attendre le montage, sinon le rendu casse.
  const [mounted, setMounted] = useState(false)
  const rafRef = useRef<number | null>(null)

  const step = steps[index]
  const isFirst = index === 0
  const isLast = index === steps.length - 1

  useEffect(() => setMounted(true), [])

  // ── Résolution de la cible ────────────────────────────────────────────────
  // Une étape peut viser un élément d'une autre page : on navigue, puis on
  // attend son apparition plutôt que de supposer qu'il est déjà monté.
  const locate = useCallback((selector: string | undefined): Promise<Box | null> => {
    if (!selector) return Promise.resolve(null)

    return new Promise(resolve => {
      const deadline = Date.now() + 4000
      // Un élément présent mais de taille nulle est masqué par CSS — la barre
      // latérale sur mobile, par exemple. Inutile d'attendre la pleine échéance
      // dans ce cas : on abandonne vite et l'étape s'affiche centrée.
      const hiddenDeadline = Date.now() + 700
      const attempt = () => {
        const el = document.querySelector(selector)
        if (el) {
          const r = el.getBoundingClientRect()
          if (r.width === 0 && r.height === 0 && Date.now() > hiddenDeadline) {
            resolve(null)
            return
          }
          if (r.width > 0 && r.height > 0) {
            const needsScroll = r.top < 80 || r.bottom > window.innerHeight - 80
            if (needsScroll) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
            // Laisser le défilement se stabiliser avant de mesurer.
            setTimeout(() => {
              const f = el.getBoundingClientRect()
              resolve({ top: f.top, left: f.left, width: f.width, height: f.height })
            }, needsScroll ? 420 : 0)
            return
          }
        }
        if (Date.now() > deadline) { resolve(null); return }
        rafRef.current = requestAnimationFrame(attempt)
      }
      attempt()
    })
  }, [])

  // ── Jouer l'étape courante ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setSettling(true)

    // Une étape qui change de page n'est jouée qu'une fois la page arrivée.
    // Sans cette attente, la bulle apparaît immédiatement — elle décrit un
    // écran encore invisible, puis clignote quand la navigation aboutit et
    // relance l'effet. Quatre des six étapes du parcours salarié sont dans ce
    // cas. Le changement de `pathname` rejoue cet effet, qui prend alors la
    // branche normale.
    if (step.route && step.route !== pathname) {
      router.push(step.route)
      // Filet : une navigation qui n'aboutit pas ne doit pas figer la visite.
      const rescue = setTimeout(() => { setVisible(true); setSettling(false) }, 2500)
      return () => clearTimeout(rescue)
    }

    const run = async () => {
      const found = await locate(step.selector)
      if (cancelled) return
      setBox(found)
      setVisible(true)
      setSettling(false)
    }

    run()
    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [index, step, pathname, router, locate])

  // ── Suivi du défilement et du redimensionnement ───────────────────────────
  useEffect(() => {
    if (!step.selector) return
    const sync = () => {
      const el = document.querySelector(step.selector!)
      if (!el) return
      const r = el.getBoundingClientRect()
      setBox({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    window.addEventListener('scroll', sync, true)
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('scroll', sync, true)
      window.removeEventListener('resize', sync)
    }
  }, [step])

  const next = useCallback(() => {
    if (isLast) { onFinish(); return }
    setIndex(i => i + 1)
  }, [isLast, onFinish])

  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), [])

  // ── Clavier ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
      else if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, onClose])

  if (!mounted) return null

  const pad = step.pad ?? 8
  const halo: Box | null = box
    ? { top: box.top - pad, left: box.left - pad, width: box.width + pad * 2, height: box.height + pad * 2 }
    : null

  // Placement de la bulle : sous la cible si la place le permet, au-dessus
  // sinon, et centrée quand l'étape n'a pas de cible.
  const CARD_W = 380
  // Estimation revue à la hausse depuis que les étapes portent une explication
  // complète : sous-estimer la hauteur place la bulle sous une cible basse, où
  // elle sort de l'écran.
  const CARD_H_EST = 300
  let cardStyle: React.CSSProperties

  if (!halo) {
    cardStyle = { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }
  } else {
    const below = halo.top + halo.height + 16
    const fitsBelow = below + CARD_H_EST < window.innerHeight
    const top = fitsBelow ? below : Math.max(16, halo.top - CARD_H_EST - 16)
    let left = halo.left + halo.width / 2 - CARD_W / 2
    left = Math.min(Math.max(16, left), window.innerWidth - CARD_W - 16)
    cardStyle = { top, left }
  }

  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        opacity: visible ? 1 : 0,
        transition: `opacity 260ms ${EASE}`,
        pointerEvents: 'none',
      }}
    >
      {/* Voile + découpe. Le box-shadow démesuré assombrit tout SAUF le halo,
          et se laisse animer proprement d'une cible à l'autre. */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: halo?.top ?? window.innerHeight / 2,
          left: halo?.left ?? window.innerWidth / 2,
          width: halo?.width ?? 0,
          height: halo?.height ?? 0,
          borderRadius: 14,
          boxShadow: `0 0 0 9999px ${halo ? SCRIM : SCRIM_SOFT}`,
          transition: `all 520ms ${EASE}`,
          pointerEvents: 'auto',
        }}
      />

      {/* Liseré lumineux autour de la cible */}
      {halo && (
        <div
          style={{
            position: 'absolute',
            top: halo.top, left: halo.left, width: halo.width, height: halo.height,
            borderRadius: 14,
            border: '2px solid #6C63FF',
            boxShadow: '0 0 0 4px rgba(108,99,255,.28), 0 0 34px rgba(108,99,255,.45)',
            transition: `all 520ms ${EASE}`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Bulle */}
      <div
        data-tour-card
        style={{
          position: 'absolute',
          width: CARD_W, maxWidth: 'calc(100vw - 32px)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 24px 70px rgba(0,0,0,.45)',
          overflow: 'hidden',
          // Filet pour les étapes les plus longues sur petit écran : la bulle
          // défile plutôt que de déborder hors du champ. Après `overflow`, que
          // l'ordre des propriétés ferait sinon gagner.
          maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
          pointerEvents: 'auto',
          opacity: settling ? 0 : 1,
          transition: `top 520ms ${EASE}, left 520ms ${EASE}, opacity 200ms ${EASE}`,
          ...cardStyle,
        }}
      >
        <div style={{ height: 3, background: 'var(--border)' }}>
          <div style={{
            height: '100%', width: `${((index + 1) / steps.length) * 100}%`,
            background: '#6C63FF', transition: `width 520ms ${EASE}`,
          }} />
        </div>

        <div style={{ padding: '18px 20px 16px' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
            color: '#6C63FF', marginBottom: 8,
          }}>
            Étape {index + 1} sur {steps.length}
          </div>

          <h3 style={{
            fontSize: 17, fontWeight: 700, letterSpacing: '-.02em', margin: 0,
            color: 'var(--text-primary)',
          }}>
            {step.title}
          </h3>

          <p style={{
            fontSize: 13.5, lineHeight: 1.6, marginTop: 8, marginBottom: 0,
            color: 'var(--text-secondary)',
          }}>
            {step.body}
          </p>

          {step.takeaway && (
            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 10,
              background: 'rgba(108,99,255,.09)',
              borderLeft: '2px solid #6C63FF',
              fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-primary)',
            }}>
              {step.takeaway}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderTop: '1px solid var(--border)',
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12.5, color: 'var(--text-tertiary)', padding: '6px 4px',
            }}
          >
            Quitter
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isFirst && (
              <button
                onClick={prev}
                aria-label="Étape précédente"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px', borderRadius: 9, cursor: 'pointer',
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600,
                }}
              >
                <ArrowLeft size={13} strokeWidth={2.4} />
                Retour
              </button>
            )}
            <button
              onClick={next}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 15px', borderRadius: 9, cursor: 'pointer',
                background: '#6C63FF', border: 'none', color: '#fff',
                fontSize: 12.5, fontWeight: 700,
              }}
            >
              {isLast ? <>Terminer<Check size={14} strokeWidth={2.6} /></> : <>Suivant<ArrowRight size={14} strokeWidth={2.6} /></>}
            </button>
          </div>
        </div>
      </div>

      {/* Fermeture rapide, toujours atteignable */}
      <button
        onClick={onClose}
        aria-label="Quitter la visite"
        style={{
          position: 'absolute', top: 18, right: 18,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 13px', borderRadius: 10, cursor: 'pointer',
          background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.18)',
          color: '#fff', fontSize: 12.5, fontWeight: 600,
          backdropFilter: 'blur(6px)', pointerEvents: 'auto',
        }}
      >
        <X size={13} strokeWidth={2.6} />
        Quitter la visite
      </button>
    </div>
  )
}
