import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { CompanyData, loadCompany } from './company';

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#161616' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  brand: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#093a68' },
  brandSub: { fontSize: 9, color: '#525252', marginTop: 2 },
  title: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#093a68', textAlign: 'right' },
  ref: { fontSize: 11, color: '#525252', textAlign: 'right', marginTop: 4 },
  section: { marginBottom: 20 },
  label: { fontSize: 8, color: '#6f6f6f', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  value: { fontSize: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e0e0e0', marginVertical: 12 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#093a68', color: '#ffffff', padding: '6 8' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', padding: '6 8' },
  tableRowAlt: { flexDirection: 'row', backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', padding: '6 8' },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: 'center' },
  col3: { flex: 1, textAlign: 'right' },
  col4: { flex: 1, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 40, marginTop: 4 },
  totalLabel: { color: '#525252' },
  totalValue: { minWidth: 80, textAlign: 'right' },
  grandTotal: { flexDirection: 'row', justifyContent: 'flex-end', gap: 40, marginTop: 4, padding: '8 0' },
  grandLabel: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#093a68' },
  grandValue: { minWidth: 80, textAlign: 'right', fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#093a68' },
  statusBadge: { padding: '3 8', borderRadius: 4, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  notes: { marginTop: 16, padding: 12, backgroundColor: '#f9fafb', borderLeftWidth: 3, borderLeftColor: '#093a68' },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#a8a8a8' },
});

const fmt = (n: number) => `$${n.toFixed(2)}`;

const statusColor: Record<string, string> = {
  draft: '#e0e0e0',
  sent: '#dbeafe',
  paid: '#dcfce7',
  overdue: '#fee2e2',
  cancelled: '#f3f4f6',
};

type InvoiceData = {
  invoiceRef: string;
  status: string;
  issueDate: string;
  dueDate: string;
  paidAt?: Date | null;
  paidRef?: string | null;
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  notes?: string | null;
  customer: { name: string; email: string; phone: string; address: string };
  job?: { jobCardRef: string; title: string } | null;
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
};

export function InvoicePDF({ invoice, company }: { invoice: InvoiceData; company?: CompanyData }) {
  const c = company || { name: 'Splash Air', address: '', phone: '', email: '', website: '', vatRate: 15.5, vatNumber: '', logoUrl: '', tagline: 'Air Conditioning & Refrigeration', services: '' };
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {c.logoUrl ? (
              <Image source={{ uri: c.logoUrl, method: 'GET', headers: { Accept: 'image/*' } }} style={{ width: 50, height: 50 }} />
            ) : null}
            <View>
              <Text style={styles.brand}>{c.name}</Text>
              <Text style={styles.brandSub}>{c.tagline}</Text>
              {c.address && <Text style={[styles.brandSub, { fontSize: 7, marginTop: 4 }]}>{c.address}</Text>}
              {c.phone && <Text style={[styles.brandSub, { fontSize: 7 }]}>{c.phone}</Text>}
            </View>
          </View>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.ref}>{invoice.invoiceRef}</Text>
            <View style={{ alignItems: 'flex-end', marginTop: 6 }}>
              <Text style={[styles.statusBadge, { backgroundColor: statusColor[invoice.status] || '#e0e0e0' }]}>
                {invoice.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To + Dates */}
        <View style={[styles.row, { marginBottom: 24 }]}>
          <View style={{ flex: 2 }}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={[styles.value, { fontFamily: 'Helvetica-Bold' }]}>{invoice.customer.name}</Text>
            <Text style={styles.value}>{invoice.customer.email}</Text>
            <Text style={styles.value}>{invoice.customer.phone}</Text>
            <Text style={styles.value}>{invoice.customer.address}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Issue Date</Text>
            <Text style={[styles.value, { marginBottom: 8 }]}>{invoice.issueDate}</Text>
            <Text style={styles.label}>Due Date</Text>
            <Text style={styles.value}>{invoice.dueDate}</Text>
            {invoice.job && (
              <>
                <Text style={[styles.label, { marginTop: 8 }]}>Job Reference</Text>
                <Text style={styles.value}>{invoice.job.jobCardRef}</Text>
              </>
            )}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.col1, { color: '#fff', fontFamily: 'Helvetica-Bold' }]}>Description</Text>
          <Text style={[styles.col2, { color: '#fff', fontFamily: 'Helvetica-Bold' }]}>Qty</Text>
          <Text style={[styles.col3, { color: '#fff', fontFamily: 'Helvetica-Bold' }]}>Unit Price</Text>
          <Text style={[styles.col4, { color: '#fff', fontFamily: 'Helvetica-Bold' }]}>Total</Text>
        </View>
        {invoice.lineItems.map((line, i) => (
          <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={styles.col1}>{line.description}</Text>
            <Text style={styles.col2}>{line.quantity}</Text>
            <Text style={styles.col3}>{fmt(line.unitPrice)}</Text>
            <Text style={styles.col4}>{fmt(line.total)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={{ marginTop: 12 }}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmt(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VAT ({invoice.taxRate}%)</Text>
            <Text style={styles.totalValue}>{fmt(invoice.tax)}</Text>
          </View>
          <View style={[styles.divider, { marginTop: 8 }]} />
          <View style={styles.grandTotal}>
            <Text style={styles.grandLabel}>TOTAL DUE</Text>
            <Text style={styles.grandValue}>{fmt(invoice.total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.value}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{c.name} · {c.phone}</Text>
          <Text style={styles.footerText}>{invoice.invoiceRef}</Text>
          <Text style={styles.footerText}>{c.website}</Text>
        </View>
      </Page>
    </Document>
  );
}
