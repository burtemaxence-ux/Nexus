'use client'

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const c = {
  navy:    '#1e3a5f',
  slate:   '#334155',
  muted:   '#64748b',
  border:  '#cbd5e1',
  light:   '#f8fafc',
  white:   '#ffffff',
  accent:  '#2563eb',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 40,
    backgroundColor: c.white,
    color: c.slate,
    lineHeight: 1.5,
  },
  header: {
    borderBottom: `2 solid ${c.navy}`,
    paddingBottom: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerLeft: { gap: 3 },
  estName: { fontSize: 14, fontWeight: 'bold', color: c.navy },
  docTitle: { fontSize: 11, fontWeight: 'bold', color: c.accent, marginBottom: 2 },
  meta: { fontSize: 7.5, color: c.muted },
  body: { marginTop: 8, gap: 10 },
  paragraph: { fontSize: 9, color: c.slate, marginBottom: 6 },
  pre: {
    fontSize: 9,
    fontFamily: 'Courier',
    backgroundColor: c.light,
    padding: 12,
    borderRadius: 4,
    border: `0.5 solid ${c.border}`,
    whiteSpace: 'pre-wrap',
    color: c.slate,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    gap: 20,
  },
  signatureBox: {
    flex: 1,
    borderTop: `1 solid ${c.border}`,
    paddingTop: 8,
    gap: 4,
  },
  sigLabel: { fontSize: 8, color: c.muted },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: c.muted,
    borderTop: `0.5 solid ${c.border}`,
    paddingTop: 6,
  },
})

interface AvenantDocumentProps {
  documentText: string
  employeeName: string
  establishmentName: string
  documentType: string
  generatedDate: string
}

const DOCTYPE_LABELS: Record<string, string> = {
  avenant_heures: 'Avenant — Modification durée du travail',
  avenant_cdd: 'Avenant — Renouvellement CDD',
  lettre_confirmation_essai: 'Lettre de confirmation — Fin période d\'essai',
  lettre_rupture_essai: 'Lettre de rupture — Période d\'essai',
}

export function AvenantDocument({ documentText, employeeName, establishmentName, documentType, generatedDate }: AvenantDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.estName}>{establishmentName}</Text>
            <Text style={styles.docTitle}>{DOCTYPE_LABELS[documentType] ?? 'Document RH'}</Text>
            <Text style={styles.meta}>Employé(e) : {employeeName}</Text>
          </View>
          <View>
            <Text style={styles.meta}>Document généré le {generatedDate}</Text>
            <Text style={styles.meta}>Quartzbase — Gestion RH</Text>
          </View>
        </View>

        {/* Document body */}
        <View style={styles.body}>
          <Text style={styles.pre}>{documentText}</Text>
        </View>

        {/* Signatures */}
        {(documentType === 'avenant_heures' || documentType === 'avenant_cdd') && (
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.sigLabel}>Pour l&apos;établissement</Text>
              <Text style={styles.sigLabel}>Nom, qualité :</Text>
              <Text style={styles.sigLabel}>Date :</Text>
              <Text style={styles.sigLabel}>Signature :</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.sigLabel}>Lu et approuvé — {employeeName}</Text>
              <Text style={styles.sigLabel}>Date :</Text>
              <Text style={styles.sigLabel}>Signature :</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Document généré par Quartzbase · {establishmentName}</Text>
          <Text>💡 À valider avec votre expert-comptable ou avocat RH</Text>
        </View>
      </Page>
    </Document>
  )
}
