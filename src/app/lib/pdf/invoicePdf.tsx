import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { CompanyData } from './company';
import { PDF_BRAND_BLUE, PDF_BRAND_BLUE_DARK, PDF_BRAND_BLUE_LIGHT, PDF_FONT_FAMILY, pdfLogoSource } from './brand';

const styles = StyleSheet.create({
  page: { padding: 48, paddingTop: 42, fontSize: 10, fontFamily: PDF_FONT_FAMILY, color: '#161616', lineHeight: 1.35 },
  topRule: { height: 5, backgroundColor: PDF_BRAND_BLUE, marginBottom: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  logo: { width: 128, height: 72, objectFit: 'contain' },
  brand: { fontSize: 12, fontWeight: 600, color: PDF_BRAND_BLUE },
  brandSub: { fontSize: 9, color: '#525252', marginTop: 2 },
  title: { fontSize: 26, lineHeight: 1.15, fontWeight: 700, color: PDF_BRAND_BLUE_DARK, textAlign: 'right', letterSpacing: 0.8 },
  ref: { fontSize: 11, color: '#525252', textAlign: 'right', marginTop: 8 },
  section: { marginBottom: 20 },
  label: { fontSize: 8, color: '#6f6f6f', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  value: { fontSize: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e0e0e0', marginVertical: 12 },
  tableHeader: { flexDirection: 'row', backgroundColor: PDF_BRAND_BLUE, color: '#ffffff', padding: '8 9' },
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
  grandLabel: { fontWeight: 700, fontSize: 12, color: PDF_BRAND_BLUE },
  grandValue: { minWidth: 80, textAlign: 'right', fontWeight: 700, fontSize: 12, color: PDF_BRAND_BLUE },
  statusBadge: { padding: '4 9', borderRadius: 10, fontSize: 8, fontWeight: 700, letterSpacing: 0.6 },
  notes: { marginTop: 16, padding: 12, backgroundColor: PDF_BRAND_BLUE_LIGHT, borderLeftWidth: 3, borderLeftColor: PDF_BRAND_BLUE },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#a8a8a8' },
});

const fmt = (n: number) => `$${n.toFixed(2)}`;

const statusColor: Record<string, string> = {
  draft: '#e0e0e0',
  sent: '#dbeafe',
  partial: '#fef3c7',
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
  discount?: number;
  balance?: number;
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
        <View style={styles.topRule} />
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image does not expose an alt prop */}
            <Image source={pdfLogoSource(c.logoUrl)} style={styles.logo} />
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
            <Text style={[styles.value, { fontWeight: 600 }]}>{invoice.customer.name}</Text>
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
          <Text style={[styles.col1, { color: '#fff', fontWeight: 600 }]}>Description</Text>
          <Text style={[styles.col2, { color: '#fff', fontWeight: 600 }]}>Qty</Text>
          <Text style={[styles.col3, { color: '#fff', fontWeight: 600 }]}>Unit Price</Text>
          <Text style={[styles.col4, { color: '#fff', fontWeight: 600 }]}>Total</Text>
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
          {!!invoice.discount && <View style={styles.totalRow}><Text style={styles.totalLabel}>Discount</Text><Text style={styles.totalValue}>-{fmt(invoice.discount)}</Text></View>}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VAT ({invoice.taxRate}%)</Text>
            <Text style={styles.totalValue}>{fmt(invoice.tax)}</Text>
          </View>
          <View style={[styles.divider, { marginTop: 8 }]} />
          <View style={styles.grandTotal}>
            <Text style={styles.grandLabel}>OUTSTANDING</Text>
            <Text style={styles.grandValue}>{fmt(invoice.balance ?? invoice.total)}</Text>
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
