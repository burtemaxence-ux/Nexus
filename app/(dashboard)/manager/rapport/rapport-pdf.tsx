'use client'

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const c = {
  slate900: '#0f172a',
  slate700: '#334155',
  slate500: '#64748b',
  slate300: '#cbd5e1',
  slate100: '#f1f5f9',
  slate50:  '#f8fafc',
  white:    '#ffffff',
  primary:  '#6366f1',
  green:    '#16a34a',
  red:      '#dc2626',
  amber:    '#d97706',
}

const styles = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', fontSize: 8, padding: 28, backgroundColor: c.white, color: c.slate900 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottom: `1.5 solid ${c.primary}` },
  headerLeft: { gap: 3 },
  title:      { fontSize: 15, fontWeight: 'bold', color: c.slate900 },
  subtitle:   { fontSize: 9, color: c.slate500 },
  meta:       { fontSize: 7.5, color: c.slate500, textAlign: 'right' },
  badge:      { backgroundColor: c.primary, color: c.white, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 8, fontWeight: 'bold', alignSelf: 'flex-start' },
  tableHead:  { flexDirection: 'row', backgroundColor: c.slate100, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 4, marginBottom: 3 },
  tableRow:   { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottom: `0.5 solid ${c.slate300}` },
  tableRowAlt:{ flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, backgroundColor: c.slate50, borderBottom: `0.5 solid ${c.slate300}` },
  colEmp:     { width: '18%' },
  colContract:{ width: '10%' },
  colHPlanned:{ width: '10%' },
  colHReal:   { width: '10%' },
  colHRef:    { width: '10%' },
  colDiff:    { width: '9%' },
  colDays:    { width: '8%' },
  colBreaks:  { width: '9%' },
  colAbs:     { width: '16%' },
  thText:     { fontSize: 7, fontWeight: 'bold', color: c.slate500, textTransform: 'uppercase' },
  tdMain:     { fontSize: 8, color: c.slate900 },
  tdSub:      { fontSize: 6.5, color: c.slate500 },
  tdPos:      { fontSize: 8, color: c.green, fontWeight: 'bold' },
  tdNeg:      { fontSize: 8, color: c.red, fontWeight: 'bold' },
  tdNeu:      { fontSize: 8, color: c.slate500 },
  footer:     { position: 'absolute', bottom: 16, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: c.slate500, borderTop: `0.5 solid ${c.slate300}`, paddingTop: 6 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryBox: { flex: 1, backgroundColor: c.slate50, borderRadius: 5, padding: 8, border: `0.5 solid ${c.slate300}` },
  summaryVal: { fontSize: 14, fontWeight: 'bold', color: c.slate900 },
  summaryLbl: { fontSize: 7, color: c.slate500, marginTop: 2 },
})

export type EmployeeReportRow = {
  id: string
  name: string
  position: string | null
  contractType: string | null
  weeklyHours: number | null
  plannedHours: number
  realHours: number
  contractRefHours: number
  diffHours: number
  plannedDays: number
  totalBreakMinutes: number
  absenceCP: number
  absenceRTT: number
  absenceMaladie: number
  absenceSS: number
  absenceAutre: number
  hourlyRate?: number | null
  estimatedCost?: number | null
}

interface Props {
  rows: EmployeeReportRow[]
  periodLabel: string
  establishmentName: string
}

function fh(h: number): string {
  const sign = h < 0 ? '-' : ''
  const abs = Math.abs(h)
  const hh = Math.floor(abs)
  const mm = Math.round((abs - hh) * 60)
  return `${sign}${hh}h${mm > 0 ? mm.toString().padStart(2, '0') : ''}`
}

export function RapportDocument({ rows, periodLabel, establishmentName }: Props) {
  const totalPlanned = rows.reduce((s, r) => s + r.plannedHours, 0)
  const totalReal = rows.reduce((s, r) => s + r.realHours, 0)
  const totalDiff = rows.reduce((s, r) => s + r.diffHours, 0)
  const totalAbs = rows.reduce((s, r) => s + r.absenceCP + r.absenceRTT + r.absenceMaladie + r.absenceSS + r.absenceAutre, 0)
  const now = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Rapport de planning</Text>
            <Text style={styles.subtitle}>{establishmentName}</Text>
            <View style={{ marginTop: 4 }}>
              <Text style={styles.badge}>{periodLabel}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.meta}>Généré le {now}</Text>
            <Text style={[styles.meta, { marginTop: 2 }]}>{rows.length} employé{rows.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryVal}>{fh(totalPlanned)}</Text>
            <Text style={styles.summaryLbl}>Heures planifiées</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryVal}>{totalReal > 0 ? fh(totalReal) : '—'}</Text>
            <Text style={styles.summaryLbl}>Heures réelles</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryVal, { color: totalDiff >= 0 ? c.green : c.red }]}>
              {totalDiff >= 0 ? '+' : ''}{fh(totalDiff)}
            </Text>
            <Text style={styles.summaryLbl}>Écart total</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryVal}>{totalAbs}</Text>
            <Text style={styles.summaryLbl}>Jours d&apos;absence</Text>
          </View>
        </View>

        {/* Table header */}
        <View style={styles.tableHead}>
          <Text style={[styles.thText, styles.colEmp]}>Employé</Text>
          <Text style={[styles.thText, styles.colContract]}>Contrat</Text>
          <Text style={[styles.thText, styles.colHPlanned]}>H. planif.</Text>
          <Text style={[styles.thText, styles.colHReal]}>H. réelles</Text>
          <Text style={[styles.thText, styles.colHRef]}>H. contrat</Text>
          <Text style={[styles.thText, styles.colDiff]}>Écart</Text>
          <Text style={[styles.thText, styles.colDays]}>Jours</Text>
          <Text style={[styles.thText, styles.colBreaks]}>Pauses</Text>
          <Text style={[styles.thText, styles.colAbs]}>Absences</Text>
        </View>

        {/* Rows */}
        {rows.map((row, i) => (
          <View key={row.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <View style={styles.colEmp}>
              <Text style={styles.tdMain}>{row.name}</Text>
              {row.position && <Text style={styles.tdSub}>{row.position}</Text>}
            </View>
            <View style={styles.colContract}>
              <Text style={styles.tdMain}>{row.contractType ?? '—'}</Text>
              {row.weeklyHours && <Text style={styles.tdSub}>{row.weeklyHours}h/sem.</Text>}
            </View>
            <Text style={[styles.tdMain, styles.colHPlanned]}>{fh(row.plannedHours)}</Text>
            <Text style={[styles.tdNeu, styles.colHReal]}>{row.realHours > 0 ? fh(row.realHours) : '—'}</Text>
            <Text style={[styles.tdNeu, styles.colHRef]}>{row.contractRefHours > 0 ? fh(row.contractRefHours) : '—'}</Text>
            <Text style={[row.diffHours > 0.1 ? styles.tdPos : row.diffHours < -0.1 ? styles.tdNeg : styles.tdNeu, styles.colDiff]}>
              {row.diffHours >= 0 ? '+' : ''}{fh(row.diffHours)}
            </Text>
            <Text style={[styles.tdMain, styles.colDays]}>{row.plannedDays}j</Text>
            <Text style={[styles.tdNeu, styles.colBreaks]}>{row.totalBreakMinutes > 0 ? `${row.totalBreakMinutes}min` : '—'}</Text>
            <View style={styles.colAbs}>
              {row.absenceCP > 0    && <Text style={styles.tdSub}>CP: {row.absenceCP}j  </Text>}
              {row.absenceRTT > 0   && <Text style={styles.tdSub}>RTT: {row.absenceRTT}j  </Text>}
              {row.absenceMaladie > 0 && <Text style={styles.tdSub}>Mal: {row.absenceMaladie}j  </Text>}
              {row.absenceSS > 0    && <Text style={styles.tdSub}>SS: {row.absenceSS}j  </Text>}
              {row.absenceAutre > 0 && <Text style={styles.tdSub}>Autre: {row.absenceAutre}j</Text>}
              {(row.absenceCP + row.absenceRTT + row.absenceMaladie + row.absenceSS + row.absenceAutre) === 0 && (
                <Text style={styles.tdSub}>—</Text>
              )}
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Quartzbase — {establishmentName}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
