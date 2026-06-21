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
  amber:    '#d97706',
  red:      '#dc2626',
}

const styles = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 8, padding: 28, backgroundColor: c.white, color: c.slate900 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottom: `1.5 solid ${c.primary}` },
  headerLeft:  { gap: 3 },
  title:       { fontSize: 15, fontWeight: 'bold', color: c.slate900 },
  subtitle:    { fontSize: 9, color: c.slate500 },
  meta:        { fontSize: 7.5, color: c.slate500, textAlign: 'right' },
  badge:       { backgroundColor: c.primary, color: c.white, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 8, fontWeight: 'bold', alignSelf: 'flex-start' },
  summaryRow:  { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryBox:  { flex: 1, backgroundColor: c.slate50, borderRadius: 5, padding: 8, border: `0.5 solid ${c.slate300}` },
  summaryVal:  { fontSize: 14, fontWeight: 'bold', color: c.slate900 },
  summaryLbl:  { fontSize: 7, color: c.slate500, marginTop: 2 },
  tableHead:   { flexDirection: 'row', backgroundColor: c.slate100, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 4, marginBottom: 3 },
  tableRow:    { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottom: `0.5 solid ${c.slate300}` },
  tableRowAlt: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, backgroundColor: c.slate50, borderBottom: `0.5 solid ${c.slate300}` },
  totalRow:    { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 6, backgroundColor: c.slate100, borderTop: `1 solid ${c.slate300}`, marginTop: 2, borderRadius: 4 },
  colMat:      { width: '9%' },
  colEmp:      { width: '21%' },
  colNum:      { width: '10%', textAlign: 'right' },
  colDay:      { width: '8%', textAlign: 'right' },
  thText:      { fontSize: 7, fontWeight: 'bold', color: c.slate500, textTransform: 'uppercase' },
  thNum:       { fontSize: 7, fontWeight: 'bold', color: c.slate500, textTransform: 'uppercase', textAlign: 'right' },
  tdMain:      { fontSize: 8, color: c.slate900 },
  tdSub:       { fontSize: 6.5, color: c.slate500 },
  tdNum:       { fontSize: 8, color: c.slate900, textAlign: 'right' },
  tdNeu:       { fontSize: 8, color: c.slate500, textAlign: 'right' },
  tdAmber:     { fontSize: 8, color: c.amber, fontWeight: 'bold', textAlign: 'right' },
  tdRed:       { fontSize: 8, color: c.red, fontWeight: 'bold', textAlign: 'right' },
  tdBold:      { fontSize: 8, color: c.slate900, fontWeight: 'bold', textAlign: 'right' },
  footer:      { position: 'absolute', bottom: 16, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: c.slate500, borderTop: `0.5 solid ${c.slate300}`, paddingTop: 6 },
})

export type PaieReportRow = {
  id: string
  name: string | null
  position: string | null
  matricule: string
  normalHours: number
  sup25Hours: number
  sup50Hours: number
  cpDays: number
  rttDays: number
  maladieDays: number
  ssDays: number
  autreDays: number
}

interface Props {
  rows: PaieReportRow[]
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

const day = (n: number) => (n > 0 ? `${n}j` : '—')

export function PaieDocument({ rows, periodLabel, establishmentName }: Props) {
  const tNormal = rows.reduce((s, r) => s + r.normalHours, 0)
  const tSup25 = rows.reduce((s, r) => s + r.sup25Hours, 0)
  const tSup50 = rows.reduce((s, r) => s + r.sup50Hours, 0)
  const tCp = rows.reduce((s, r) => s + r.cpDays, 0)
  const tRtt = rows.reduce((s, r) => s + r.rttDays, 0)
  const tMal = rows.reduce((s, r) => s + r.maladieDays, 0)
  const tSs = rows.reduce((s, r) => s + r.ssDays, 0)
  const tAutre = rows.reduce((s, r) => s + r.autreDays, 0)
  const tAbs = tCp + tRtt + tMal + tSs + tAutre
  const now = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Variables de paie</Text>
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
            <Text style={styles.summaryVal}>{fh(tNormal)}</Text>
            <Text style={styles.summaryLbl}>Heures normales</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryVal, { color: c.amber }]}>{fh(tSup25)}</Text>
            <Text style={styles.summaryLbl}>Heures sup. 25%</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryVal, { color: c.red }]}>{fh(tSup50)}</Text>
            <Text style={styles.summaryLbl}>Heures sup. 50%</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryVal}>{tAbs}</Text>
            <Text style={styles.summaryLbl}>Jours d&apos;absence</Text>
          </View>
        </View>

        {/* Table header */}
        <View style={styles.tableHead}>
          <Text style={[styles.thText, styles.colMat]}>Matricule</Text>
          <Text style={[styles.thText, styles.colEmp]}>Employé</Text>
          <Text style={[styles.thNum, styles.colNum]}>H. normales</Text>
          <Text style={[styles.thNum, styles.colNum]}>H. sup 25%</Text>
          <Text style={[styles.thNum, styles.colNum]}>H. sup 50%</Text>
          <Text style={[styles.thNum, styles.colDay]}>CP</Text>
          <Text style={[styles.thNum, styles.colDay]}>RTT</Text>
          <Text style={[styles.thNum, styles.colDay]}>Maladie</Text>
          <Text style={[styles.thNum, styles.colDay]}>S. solde</Text>
          <Text style={[styles.thNum, styles.colDay]}>Autre</Text>
        </View>

        {/* Rows */}
        {rows.map((row, i) => (
          <View key={row.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={[styles.tdNeu, styles.colMat, { textAlign: 'left' }]}>{row.matricule}</Text>
            <View style={styles.colEmp}>
              <Text style={styles.tdMain}>{row.name ?? '—'}</Text>
              {row.position && <Text style={styles.tdSub}>{row.position}</Text>}
            </View>
            <Text style={[styles.tdNum, styles.colNum]}>{row.normalHours > 0 ? fh(row.normalHours) : '—'}</Text>
            <Text style={[row.sup25Hours > 0 ? styles.tdAmber : styles.tdNeu, styles.colNum]}>{row.sup25Hours > 0 ? fh(row.sup25Hours) : '—'}</Text>
            <Text style={[row.sup50Hours > 0 ? styles.tdRed : styles.tdNeu, styles.colNum]}>{row.sup50Hours > 0 ? fh(row.sup50Hours) : '—'}</Text>
            <Text style={[styles.tdNeu, styles.colDay]}>{day(row.cpDays)}</Text>
            <Text style={[styles.tdNeu, styles.colDay]}>{day(row.rttDays)}</Text>
            <Text style={[styles.tdNeu, styles.colDay]}>{day(row.maladieDays)}</Text>
            <Text style={[styles.tdNeu, styles.colDay]}>{day(row.ssDays)}</Text>
            <Text style={[styles.tdNeu, styles.colDay]}>{day(row.autreDays)}</Text>
          </View>
        ))}

        {/* Totals */}
        {rows.length > 1 && (
          <View style={styles.totalRow}>
            <Text style={[styles.thText, styles.colMat]}>Total</Text>
            <Text style={[styles.tdMain, styles.colEmp]} />
            <Text style={[styles.tdBold, styles.colNum]}>{fh(tNormal)}</Text>
            <Text style={[styles.tdAmber, styles.colNum]}>{fh(tSup25)}</Text>
            <Text style={[styles.tdRed, styles.colNum]}>{fh(tSup50)}</Text>
            <Text style={[styles.tdBold, styles.colDay]}>{tCp || '—'}</Text>
            <Text style={[styles.tdBold, styles.colDay]}>{tRtt || '—'}</Text>
            <Text style={[styles.tdBold, styles.colDay]}>{tMal || '—'}</Text>
            <Text style={[styles.tdBold, styles.colDay]}>{tSs || '—'}</Text>
            <Text style={[styles.tdBold, styles.colDay]}>{tAutre || '—'}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Quartzbase — {establishmentName}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
