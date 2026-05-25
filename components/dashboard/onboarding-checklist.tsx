'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, ChevronUp, ArrowRight, Rocket } from 'lucide-react'

interface Step {
  title: string
  description: string
  done: boolean
  href: string
  cta: string
}

interface OnboardingChecklistProps {
  steps: Step[]
}

export function OnboardingChecklist({ steps }: OnboardingChecklistProps) {
  const [collapsed, setCollapsed] = useState(false)

  const doneCount = steps.filter(s => s.done).length
  const allDone = doneCount === steps.length

  if (allDone) return null

  const progressPct = Math.round((doneCount / steps.length) * 100)

  return (
    <div style={{
      borderRadius: '12px',
      border: '0.5px solid var(--border)',
      backgroundColor: 'var(--bg-card)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '16px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
            backgroundColor: 'var(--accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Rocket size={15} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              Commencer avec D-pot
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {doneCount} sur {steps.length} étapes complétées
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '80px', height: '4px', borderRadius: '2px',
              backgroundColor: 'var(--border)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progressPct}%`,
                height: '100%',
                borderRadius: '2px',
                backgroundColor: 'var(--accent)',
                transition: 'width 400ms ease',
              }} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', minWidth: '28px' }}>
              {progressPct}%
            </span>
          </div>

          {collapsed
            ? <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
            : <ChevronUp size={14} style={{ color: 'var(--text-tertiary)' }} />
          }
        </div>
      </button>

      {/* Steps list */}
      {!collapsed && (
        <div style={{ borderTop: '0.5px solid var(--border)' }}>
          {steps.map((step, i) => {
            const isFirstIncomplete = !step.done && steps.slice(0, i).every(s => s.done)

            if (step.done) {
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 20px',
                    borderBottom: i < steps.length - 1 ? '0.5px solid var(--border)' : undefined,
                  }}
                >
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    backgroundColor: '#DCFCE7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={11} color="#16A34A" />
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textDecoration: 'line-through', flex: 1 }}>
                    {step.title}
                  </p>
                </div>
              )
            }

            return (
              <Link key={i} href={step.href} style={{ display: 'block' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '13px 20px',
                    borderBottom: i < steps.length - 1 ? '0.5px solid var(--border)' : undefined,
                    backgroundColor: isFirstIncomplete ? 'var(--accent-light)' : undefined,
                    cursor: 'pointer',
                    transition: 'background-color 150ms',
                  }}
                  className="hover:bg-[var(--accent-light)]"
                >
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    border: isFirstIncomplete ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 600,
                      color: isFirstIncomplete ? 'var(--accent)' : 'var(--text-tertiary)',
                    }}>
                      {i + 1}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '13px', fontWeight: isFirstIncomplete ? 500 : 400,
                      color: isFirstIncomplete ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}>
                      {step.title}
                    </p>
                    {step.description && (
                      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        {step.description}
                      </p>
                    )}
                  </div>

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '12px', fontWeight: 500, flexShrink: 0,
                    color: isFirstIncomplete ? 'var(--accent)' : 'var(--text-tertiary)',
                  }}>
                    {step.cta}
                    <ArrowRight size={11} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
