import { BellDot } from 'lucide-react'

export default function AlertesPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <BellDot className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">Alertes planning</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Amplitude horaire, repos journalier, heures supplémentaires, jours consécutifs — en cours de développement.
      </p>
    </div>
  )
}
