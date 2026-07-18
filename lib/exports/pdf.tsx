import React from 'react'
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'

// Rendu PDF simple et robuste d'un récapitulatif tabulaire (exports RH).
const ACCENT = '#6C63FF'

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8, fontFamily: 'Helvetica', color: '#1f2430' },
  brand: { fontSize: 14, color: ACCENT, fontFamily: 'Helvetica-Bold' },
  title: { fontSize: 13, marginTop: 10, fontFamily: 'Helvetica-Bold' },
  sub: { fontSize: 9, color: '#667085', marginTop: 2, marginBottom: 14 },
  headerRow: { flexDirection: 'row', backgroundColor: ACCENT },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  zebra: { backgroundColor: '#f7f7fb' },
  cell: { flex: 1, padding: 4 },
  headerCell: { flex: 1, padding: 4, color: '#ffffff', fontFamily: 'Helvetica-Bold' },
  empty: { marginTop: 20, fontSize: 10, color: '#667085' },
})

export async function renderReportPdf(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number | boolean | null)[][],
): Promise<Buffer> {
  const doc = (
    <Document title={title} author="Quartzbase">
      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        <Text style={styles.brand}>Quartzbase</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{subtitle}</Text>
        <View style={styles.headerRow} fixed>
          {headers.map((h, i) => <Text key={i} style={styles.headerCell}>{h}</Text>)}
        </View>
        {rows.length === 0 ? (
          <Text style={styles.empty}>Aucune donnée sur cette période.</Text>
        ) : (
          rows.map((r, ri) => (
            <View key={ri} style={ri % 2 ? [styles.row, styles.zebra] : styles.row} wrap={false}>
              {r.map((c, ci) => <Text key={ci} style={styles.cell}>{c === null || c === undefined ? '' : String(c)}</Text>)}
            </View>
          ))
        )}
      </Page>
    </Document>
  )
  return await renderToBuffer(doc)
}
