import Link from 'next/link'
import { Calendar, Clock, Users, BarChart3, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Démo — Nexus',
  description: 'Essayez Nexus gratuitement. Aucune inscription requise.',
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

      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute rounded-full" style={{ width: 600, height: 600, top: '-160px', left: '-140px', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute rounded-full" style={{ width: 500, height: 500, bottom: '-100px', right: '-100px', background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto text-center space-y-10">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#4F46E5] flex items-center justify-center font-bold text-white text-[17px] select-none">
            D
          </div>
          <span className="text-[17px] font-semibold tracking-tight text-[#18181B] dark:text-[#F0F2F8]">Nexus</span>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#4F46E5]/20 bg-white/60 dark:bg-white/10 text-[#4F46E5] text-[12px] font-medium tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
          Démo interactive — aucune inscription requise
        </div>

        {/* Headline */}
        <div className="space-y-4">
          <h1 className="text-[2.4rem] leading-[1.15] font-bold text-[#18181B] dark:text-[#F0F2F8] tracking-tight">
            Découvrez Nexus<br />
            en <span className="text-[#4F46E5]">conditions réelles</span>
          </h1>
          <p className="text-[16px] leading-relaxed text-[#6B7280] dark:text-[#8B90A7] max-w-[480px] mx-auto">
            Accédez instantanément à un compte démo pré-rempli avec un restaurant fictif complet.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/api/demo/login"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[15px] font-semibold transition-all duration-150 shadow-[0_2px_8px_0_rgba(79,70,229,0.35)] hover:shadow-[0_4px_12px_0_rgba(79,70,229,0.4)]"
          >
            Essayer la démo
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#E5E7EB] dark:border-[#2A2D3A] bg-white dark:bg-[#1A1D27] text-[#374151] dark:text-[#F0F2F8] text-[14px] font-medium hover:bg-[#F9FAFB] dark:hover:bg-[#0F1117] transition-colors duration-150"
          >
            Déjà un compte ?
          </Link>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-4">
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

        <p className="text-[11px] text-[#C4C9D4] pt-2">
          Les données de démo sont réinitialisées chaque nuit à 3h du matin.
        </p>
      </div>
    </div>
  )
}
