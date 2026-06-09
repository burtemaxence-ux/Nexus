import Link from 'next/link'
import { Calendar, Clock, Users, BarChart3, CreditCard, RefreshCw } from 'lucide-react'
import DemoLoginButton from './DemoLoginButton'

export const metadata = {
  title: 'Démo — Quartzbase',
  description: 'Essayez Quartzbase gratuitement. Aucune inscription requise.',
}

const FEATURES = [
  { icon: Calendar,  label: 'Planning intelligent',    desc: 'Créez des plannings en quelques clics, partagez-les instantanément.' },
  { icon: Clock,     label: 'Présences en temps réel', desc: 'Suivez les pointages et retards de votre équipe.' },
  { icon: Users,     label: 'Gestion des congés',      desc: 'Centralisez les demandes et validez en un clic.' },
  { icon: BarChart3, label: 'Analytiques',             desc: 'Suivez les heures, coûts et performances.' },
]

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#EDEEFF] dark:bg-[#0F1117] flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">

      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute rounded-full" style={{ width: 600, height: 600, top: '-160px', left: '-140px', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute rounded-full" style={{ width: 500, height: 500, bottom: '-100px', right: '-100px', background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto text-center space-y-8">

        <div className="flex items-center justify-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#4F46E5] flex items-center justify-center font-bold text-white text-[17px] select-none">
            Q
          </div>
          <span className="text-[17px] font-semibold tracking-tight text-[#18181B] dark:text-[#F0F2F8]">Quartzbase</span>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#4F46E5]/20 bg-white/60 dark:bg-white/10 text-[#4F46E5] text-[12px] font-medium tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
          Démo interactive — aucune inscription requise
        </div>

        <div className="space-y-4">
          <h1 className="text-[2.4rem] leading-[1.15] font-bold text-[#18181B] dark:text-[#F0F2F8] tracking-tight">
            Découvrez Quartzbase<br />
            en <span className="text-[#4F46E5]">conditions réelles</span>
          </h1>
          <p className="text-[16px] leading-relaxed text-[#6B7280] dark:text-[#8B90A7] max-w-[480px] mx-auto">
            Accédez instantanément à un compte démo pré-rempli avec une boulangerie fictive complète.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <DemoLoginButton />
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#E5E7EB] dark:border-[#2A2D3A] bg-white dark:bg-[#1A1D27] text-[#374151] dark:text-[#F0F2F8] text-[14px] font-medium hover:bg-[#F9FAFB] dark:hover:bg-[#0F1117] transition-colors duration-150"
          >
            Déjà un compte ?
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-[12px] text-[#9CA3AF]">
          <span className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Aucune carte bleue requise
          </span>
          <span className="hidden sm:block">·</span>
          <span className="flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Données réinitialisées chaque nuit
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-2">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 px-4 py-4 rounded-xl bg-white/60 dark:bg-white/5 border border-white/80 dark:border-white/10">
              <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="h-4 w-4 text-[#4F46E5]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#18181B] dark:text-[#F0F2F8]">{label}</p>
                <p className="text-[12px] text-[#6B7280] dark:text-[#8B90A7] mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
