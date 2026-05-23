import { BarChart3 } from 'lucide-react'

export default function RapportPage() {
  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Rapport</h1>
        <p className="text-muted-foreground mt-1">Synthèse des heures planifiées et réelles par employé.</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <BarChart3 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Rapport en cours de développement</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Cette section affichera les heures planifiées, les heures réelles, les absences et les compteurs par employé.
        </p>
      </div>
    </div>
  )
}
