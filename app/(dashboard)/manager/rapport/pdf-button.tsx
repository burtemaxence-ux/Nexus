'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { RapportDocument, type EmployeeReportRow } from './rapport-pdf'
import { Download } from 'lucide-react'

interface Props {
  rows: EmployeeReportRow[]
  periodLabel: string
  establishmentName: string
}

export default function PDFButton({ rows, periodLabel, establishmentName }: Props) {
  return (
    <PDFDownloadLink
      document={<RapportDocument rows={rows} periodLabel={periodLabel} establishmentName={establishmentName} />}
      fileName={`rapport-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`}
    >
      {({ loading }) => (
        <button
          disabled={loading || rows.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          {loading ? 'Génération…' : 'Télécharger PDF'}
        </button>
      )}
    </PDFDownloadLink>
  )
}
