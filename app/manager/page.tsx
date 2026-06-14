'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Calendar, Users, Palmtree, Clock, BarChart3, ArrowRight, AlertTriangle, Sparkles } from 'lucide-react'
import stats from '@/data/stats.json'
import shifts from '@/data/shifts.json'
import employees from '@/data/employees.json'
import type { ElementType } from 'react'

function getCurrentWeek() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

function getTodayDay() {
  const d = new Date().getDay()
  return d === 0 ? 6 : d - 1
}

function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    let startTime: number | null = null
    let rafId: number
    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) { rafId = requestAnimationFrame(step) }
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [target, duration])
  return value
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1)
  const h = 22
  const barW = 5
  const gap = 2
  const totalW = data.length * (barW + gap) - gap
  return (
    <svg width={totalW} height={h} style={{ display: 'block' }} aria-hidden="true">
      {data.map((val, i) => {
        const barH = val > 0 ? Math.max(4, Math.round((val / max) * h)) : 4
        return (
          <rect key={i} x={i * (barW + gap)} y={h - barH} width={barW} height={barH} rx={2}
            fill={val > 0 ? color : 'rgba(255,255,255,0.06)'} opacity={val > 0 ? 0.7 : 1} />
        )
      })}
    </svg>
  )
}

function KpiCard({ label, value, color, icon: Icon, iconBg, suffix = '', progressPct, subLabel, sparkline }: {
  label: string; value: number; color: string; icon: ElementType; iconBg: string
  suffix?: string; progressPct: number; subLabel?: string; sparkline?: number[]
}) {
  const animated = useCountUp(value)
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: '#0f0f16',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '14px',
        padding: '20px 22px',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 0 0 1px rgba(108,99,255,0.2), 0 8px 24px rgba(0,0,0,0.3)' : 'none',
        transition: 'all 200ms ease',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}
    >
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5a5a72', fontFamily: 'var(--font-dm-sans)', margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: '32px', fontWeight: 700, lineHeight: 1, color, fontFamily: 'var(--font-syne)', margin: 0 }}>
        {animated}{suffix}
      </p>
      {subLabel && (
        <p style={{ fontSize: '12px', color: '#9090a8', margin: 0 }}>{subLabel}</p>
      )}
      {sparkline && <div style={{ marginTop: '4px' }}><MiniSparkline data={sparkline} color={color} /></div>}
      <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
        <div style={{ height: '5px', borderRadius: '99px', backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '99px', width: `${Math.min(Math.max(progressPct, 0), 100)}%`, backgroundColor: color, transition: 'width 700ms ease' }} />
        </div>
      </div>
    </div>
  )
}

function demoAction() {
  toast.info('🎭 Mode démo — cette action n\'est pas disponible')
}

export default function ManagerDashboard() {
  const today = new Date()
  const todayLabel = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const todayDay = getTodayDay()

  const todayShifts = shifts
    .filter(s => s.day === todayDay)
    .map(s => {
      const emp = employees.find(e => e.id === s.employee_id)
      return { ...s, employeeName: emp?.name ?? '?', initials: emp?.initials ?? '?' }
    })

  const [modulesVisible, setModulesVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setModulesVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen dashboard-content" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap pt-1 dashboard-s0">
          <div>
            <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
              Bonjour Maxence 👋
            </h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Voici un aperçu de votre activité.
            </p>
            <p className="text-[11px] uppercase tracking-[0.06em] mt-1.5 capitalize" style={{ color: 'var(--text-tertiary)' }}>
              La Boulangerie du Soleil · {todayLabel}
            </p>
          </div>
          <Link href="/manager/planning" className="btn-primary flex-shrink-0">
            <Calendar className="h-3.5 w-3.5" />
            Voir le planning
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 dashboard-s1">
          <KpiCard
            label={`Présence · S${getCurrentWeek()}`}
            value={stats.presenceRate}
            suffix="%"
            color="#00D4AA"
            icon={BarChart3}
            iconBg="rgba(0,212,170,0.15)"
            progressPct={stats.presenceRate}
            subLabel="Bonne présence"
            sparkline={stats.sparkline}
          />
          <KpiCard
            label="Équipe"
            value={stats.activeEmployees}
            color="#6C63FF"
            icon={Users}
            iconBg="rgba(108,99,255,0.15)"
            progressPct={Math.min(stats.activeEmployees * 12, 100)}
            subLabel="employés actifs"
          />
          <KpiCard
            label="Congés en attente"
            value={stats.pendingLeaves}
            color="#FFB347"
            icon={Palmtree}
            iconBg="rgba(255,179,71,0.15)"
            progressPct={Math.min(stats.pendingLeaves * 20, 100)}
            subLabel="demandes"
          />
          <KpiCard
            label="Retards ce mois"
            value={stats.lateCount}
            color="#FF6B6B"
            icon={Clock}
            iconBg="rgba(255,107,107,0.15)"
            progressPct={Math.min(stats.lateCount * 10, 100)}
            subLabel="enregistrés"
          />
        </div>

        {/* Alertes */}
        <div className="space-y-2 dashboard-s2">
          <button onClick={demoAction} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-[rgba(255,179,71,0.05)]"
            style={{ backgroundColor: 'rgba(255,179,71,0.08)', border: '1px solid rgba(255,179,71,0.2)', borderRadius: '10px' }}>
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#FFB347' }} />
            <p className="flex-1 text-[13px]" style={{ color: '#f0f0f8', fontFamily: 'var(--font-dm-sans)' }}>
              2 demandes de congés en attente de validation
            </p>
            <span className="text-[12px] font-medium flex-shrink-0" style={{ color: '#FFB347' }}>Traiter →</span>
          </button>
          <button onClick={demoAction} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-[rgba(255,107,107,0.05)]"
            style={{ backgroundColor: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: '10px' }}>
            <Clock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#FF6B6B' }} />
            <p className="flex-1 text-[13px]" style={{ color: '#f0f0f8', fontFamily: 'var(--font-dm-sans)' }}>
              1 retard enregistré ce mois
            </p>
            <span className="text-[12px] font-medium flex-shrink-0" style={{ color: '#FF6B6B' }}>Voir →</span>
          </button>
        </div>

        {/* Planning du jour */}
        {todayShifts.length > 0 && (
          <div className="dashboard-s2">
            <p className="text-[11px] uppercase tracking-[0.06em] mb-3" style={{ color: '#5a5a72', fontFamily: 'var(--font-dm-sans)' }}>
              Planning du jour
            </p>
            <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
              {todayShifts.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < todayShifts.length - 1 ? '0.5px solid var(--border)' : 'none' }}
                >
                  <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${s.color}20` }}>
                    <span className="text-[10px] font-semibold" style={{ color: s.color }}>{s.initials}</span>
                  </div>
                  <span className="flex-1 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{s.employeeName}</span>
                  <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{s.start} → {s.end}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md" style={{ backgroundColor: `${s.color}15`, color: s.color }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions rapides */}
        <div className="dashboard-s3">
          <p className="text-[11px] uppercase tracking-[0.06em] mb-3" style={{ color: '#5a5a72', fontFamily: 'var(--font-dm-sans)' }}>
            Modules
          </p>

          {/* Planning — module principal */}
          <Link href="/manager/planning" className="block mb-3"
            style={{ opacity: modulesVisible ? 1 : 0, transform: modulesVisible ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 0.4s ease, transform 0.4s ease' }}>
            <div className="flex items-center justify-between gap-6 px-5 py-4 rounded-[14px] transition-all duration-200 hover:-translate-y-0.5"
              style={{ backgroundColor: '#0f0f16', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Calendar className="h-5 w-5" style={{ color: '#6C63FF' }} />
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#f0f0f8', fontFamily: 'var(--font-syne)' }}>Planning</p>
                  <p style={{ fontSize: '12px', color: '#9090a8', marginTop: '2px', fontFamily: 'var(--font-dm-sans)' }}>
                    Visualisez et gérez les horaires de votre équipe.
                  </p>
                </div>
              </div>
              <div className="btn-primary flex-shrink-0">Ouvrir <ArrowRight className="h-3.5 w-3.5" /></div>
            </div>
          </Link>

          {/* Actions démo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            style={{ opacity: modulesVisible ? 1 : 0, transition: 'opacity 0.4s ease 100ms' }}>
            <button
              onClick={demoAction}
              title="Fonctionnalité démo"
              className="flex items-center gap-3 px-4 py-4 rounded-[14px] text-left transition-all duration-200 cursor-not-allowed opacity-80 hover:opacity-70"
              style={{ backgroundColor: '#0f0f16', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles className="h-4 w-4" style={{ color: '#6C63FF' }} />
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#f0f0f8', fontFamily: 'var(--font-syne)' }}>Générer IA</p>
                <p style={{ fontSize: '11px', color: '#5a5a72' }}>Planning automatique</p>
              </div>
            </button>
            <button
              onClick={demoAction}
              title="Fonctionnalité démo"
              className="flex items-center gap-3 px-4 py-4 rounded-[14px] text-left transition-all duration-200 cursor-not-allowed opacity-80 hover:opacity-70"
              style={{ backgroundColor: '#0f0f16', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(255,179,71,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Palmtree className="h-4 w-4" style={{ color: '#FFB347' }} />
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#f0f0f8', fontFamily: 'var(--font-syne)' }}>Congés (2)</p>
                <p style={{ fontSize: '11px', color: '#5a5a72' }}>Valider les demandes</p>
              </div>
            </button>
            <Link
              href="/manager/compliance"
              className="flex items-center gap-3 px-4 py-4 rounded-[14px] text-left transition-all duration-200 hover:-translate-y-0.5"
              style={{ backgroundColor: '#0f0f16', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(0,212,170,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle className="h-4 w-4" style={{ color: '#00D4AA' }} />
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#f0f0f8', fontFamily: 'var(--font-syne)' }}>Conformité</p>
                <p style={{ fontSize: '11px', color: '#5a5a72' }}>Score 94/100 · 2 alertes</p>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
