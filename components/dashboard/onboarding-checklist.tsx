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
  const nextStep = steps.find(s => !s.done)

  if (allDone) return null

  const progressPct = Math.round((doneCount / steps.length) * 100)

  return (
    <div style={{
      borderRadius: '14px',
      border: '1px solid rgba(255,255,255,0.06)',
      backgroundColor: '#0f0f16',
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
            backgroundColor: 'rgba(108,99,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Rocket size={15} style={{ color: '#6C63FF' }} />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#f0f0f8', lineHeight: 1.3, fontFamily: 'var(--font-syne)' }}>
              Commencer avec Quartzbase
            </p>
            <p style={{ fontSize: '12px', color: '#5a5a72', marginTop: '2px' }}>
              {doneCount} sur {steps.length} étapes complétées
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '80px', height: '4px', borderRadius: '2px',
              backgroundColor: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progressPct}%`,
                height: '100%',
                borderRadius: '2px',
                background: 'linear-gradient(90deg, #6C63FF, #00D4AA)',
                transition: 'width 400ms ease',
              }} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#5a5a72', minWidth: '28px' }}>
              {progressPct}%
            </span>
          </div>

          {collapsed
            ? <ChevronDown size={14} style={{ color: '#5a5a72' }} />
            : <ChevronUp size={14} style={{ color: '#5a5a72' }} />
          }
        </div>
      </button>

      {/* Prochaine étape — toujours accessible, même replié */}
      {collapsed && nextStep && (
        <Link href={nextStep.href} style={{ display: 'block', textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            backgroundColor: 'rgba(108,99,255,0.08)',
          }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, color: '#6C63FF', flexShrink: 0 }}>
              Prochaine étape
            </span>
            <span style={{ fontSize: '13px', color: '#f0f0f8', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nextStep.title}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500, color: '#6C63FF', flexShrink: 0 }}>
              {nextStep.cta}
              <ArrowRight size={11} />
            </span>
          </div>
        </Link>
      )}

      {/* Steps list */}
      {!collapsed && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {steps.map((step, i) => {
            const isFirstIncomplete = !step.done && steps.slice(0, i).every(s => s.done)
            const isLast = i === steps.length - 1

            if (step.done) {
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 20px',
                    borderBottom: isLast ? undefined : '1px solid rgba(255,255,255,0.04)',
                    transition: 'background-color 150ms',
                  }}
                  className="hover:bg-[rgba(255,255,255,0.03)]"
                >
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    backgroundColor: 'rgba(0,212,170,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={11} color="#00D4AA" />
                  </div>
                  <p style={{ fontSize: '13px', color: '#9090a8', textDecoration: 'line-through', opacity: 0.5, flex: 1 }}>
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
                    padding: isFirstIncomplete ? '13px 20px 13px 18px' : '13px 20px',
                    borderBottom: isLast ? undefined : '1px solid rgba(255,255,255,0.04)',
                    backgroundColor: isFirstIncomplete ? 'rgba(108,99,255,0.08)' : undefined,
                    borderLeft: isFirstIncomplete ? '2px solid #6C63FF' : undefined,
                    cursor: 'pointer',
                    transition: 'background-color 150ms',
                  }}
                  className={isFirstIncomplete ? undefined : 'hover:bg-[rgba(255,255,255,0.03)]'}
                >
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    border: isFirstIncomplete ? '1.5px solid #6C63FF' : '1.5px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 600,
                      color: isFirstIncomplete ? '#6C63FF' : '#5a5a72',
                    }}>
                      {i + 1}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '13px', fontWeight: isFirstIncomplete ? 500 : 400,
                      color: isFirstIncomplete ? '#f0f0f8' : '#5a5a72',
                    }}>
                      {step.title}
                    </p>
                    {step.description && (
                      <p style={{ fontSize: '11px', color: '#5a5a72', marginTop: '2px' }}>
                        {step.description}
                      </p>
                    )}
                  </div>

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '12px', fontWeight: 500, flexShrink: 0,
                    color: isFirstIncomplete ? '#6C63FF' : '#5a5a72',
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
