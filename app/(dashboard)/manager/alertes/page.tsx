import { AlertTriangle } from 'lucide-react'

export default function AlertesPage() {
  return (
    <div className="px-8 py-10 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Alertes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Alertes actives : retards, dépassements de contrat, absences non justifiées.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-gray-200 bg-white px-8 py-16 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
          </div>
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">Tableau des alertes</p>
        <p className="text-xs text-gray-400">Cette section sera disponible dans une prochaine mise à jour.</p>
      </div>
    </div>
  )
}
