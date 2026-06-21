'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { PaieDocument, type PaieReportRow } from './rapport-paie-pdf'
import { FileText } from 'lucide-react'

interface Props {
  rows: PaieReportRow[]
  periodLabel: string
  establishmentName: string
}

export default function PaiePDFButton({ rows, periodLabel, establishmentName }: Props) {
  return (
    <PDFDownloadLink
      document={<PaieDocument rows={rows} periodLabel={periodLabel} establishmentName={establishmentName} />}
      fileName={`variables-paie-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`}
    >
      {({ loading }) => (
        <button
          disabled={loading || rows.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
        >
          <FileText className="h-3.5 w-3.5" />
          {loading ? 'Génération…' : 'Exporter PDF'}
        </button>
      )}
    </PDFDownloadLink>
  )
}
