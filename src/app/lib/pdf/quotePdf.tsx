import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { CompanyData } from './company';
import { PDF_BRAND_BLUE, PDF_BRAND_BLUE_DARK, PDF_BRAND_BLUE_LIGHT, PDF_FONT_FAMILY, pdfLogoSource } from './brand';

const s = StyleSheet.create({
  page: { padding: 44, paddingTop: 40, fontSize: 9.5, fontFamily: PDF_FONT_FAMILY, color: '#161616', lineHeight: 1.35 },
  topRule: { height: 5, backgroundColor: PDF_BRAND_BLUE, marginBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
  logo: { width: 128, height: 72, objectFit: 'contain' },
  brand: { fontSize: 12, fontWeight: 600, color: PDF_BRAND_BLUE },
  muted: { color: '#525252', marginTop: 3 },
  title: { fontSize: 26, lineHeight: 1.15, fontWeight: 700, color: PDF_BRAND_BLUE_DARK, textAlign: 'right', letterSpacing: 0.8 },
  label: { fontSize: 7.5, color: '#6f6f6f', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e0e0e0', marginVertical: 14 },
  tableHead: { flexDirection: 'row', backgroundColor: PDF_BRAND_BLUE, color: '#fff', padding: '8 9' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e8e8e8', padding: '7 8' },
  desc: { flex: 3 }, qty: { flex: 0.7, textAlign: 'center' }, money: { flex: 1, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 36, marginTop: 5 },
  grand: { fontSize: 12, fontWeight: 700, color: PDF_BRAND_BLUE },
  box: { marginTop: 18, padding: 12, backgroundColor: PDF_BRAND_BLUE_LIGHT, borderLeftWidth: 3, borderLeftColor: PDF_BRAND_BLUE },
  footer: { position: 'absolute', bottom: 28, left: 44, right: 44, borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 7, flexDirection: 'row', justifyContent: 'space-between', color: '#6f6f6f', fontSize: 7.5 },
});

type QuoteData = {
  quoteRef: string; status: string; tier: string; issueDate: string; validUntil: string;
  subtotal: number; discount: number; taxRate: number; tax: number; total: number;
  notes?: string | null; terms?: string | null;
  customer: { name: string; email: string; phone: string; address: string };
  lineItems: { description: string; quantity: number; unitPrice: number; total: number; category?: string | null }[];
};

const money = (value: number) => `$${value.toFixed(2)}`;

export function QuotePDF({ quote, company }: { quote: QuoteData; company: CompanyData }) {
  return <Document><Page size="A4" style={s.page}>
    <View style={s.topRule} />
    <View style={s.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image does not expose an alt prop */}
        <Image source={pdfLogoSource(company.logoUrl)} style={s.logo} />
        <View><Text style={s.brand}>{company.name}</Text><Text style={s.muted}>{company.tagline}</Text><Text style={s.muted}>{company.address}</Text><Text style={s.muted}>{company.phone}</Text></View>
      </View>
      <View><Text style={s.title}>QUOTATION</Text><Text style={[s.muted, { textAlign: 'right', marginTop: 8 }]}>{quote.quoteRef}</Text><Text style={[s.muted, { textAlign: 'right', textTransform: 'uppercase', marginTop: 5 }]}>{quote.tier} option - {quote.status}</Text></View>
    </View>
    <View style={s.divider} />
    <View style={[s.row, { marginBottom: 22 }]}>
      <View style={{ flex: 2 }}><Text style={s.label}>Prepared For</Text><Text style={{ fontWeight: 600 }}>{quote.customer.name}</Text><Text>{quote.customer.email}</Text><Text>{quote.customer.phone}</Text><Text>{quote.customer.address}</Text></View>
      <View style={{ flex: 1 }}><Text style={s.label}>Issue Date</Text><Text>{quote.issueDate}</Text><Text style={[s.label, { marginTop: 8 }]}>Valid Until</Text><Text>{quote.validUntil}</Text></View>
    </View>
    <View style={s.tableHead}><Text style={s.desc}>Description</Text><Text style={s.qty}>Qty</Text><Text style={s.money}>Unit Price</Text><Text style={s.money}>Total</Text></View>
    {quote.lineItems.map((line, index) => <View key={index} style={s.tableRow}><Text style={s.desc}>{line.description}</Text><Text style={s.qty}>{line.quantity}</Text><Text style={s.money}>{money(line.unitPrice)}</Text><Text style={s.money}>{money(line.total)}</Text></View>)}
    <View style={{ marginTop: 12 }}>
      <View style={s.totalRow}><Text>Subtotal</Text><Text style={{ minWidth: 80, textAlign: 'right' }}>{money(quote.subtotal)}</Text></View>
      {quote.discount > 0 && <View style={s.totalRow}><Text>Discount</Text><Text style={{ minWidth: 80, textAlign: 'right' }}>-{money(quote.discount)}</Text></View>}
      <View style={s.totalRow}><Text>VAT ({quote.taxRate}%)</Text><Text style={{ minWidth: 80, textAlign: 'right' }}>{money(quote.tax)}</Text></View>
      <View style={s.divider} /><View style={s.totalRow}><Text style={s.grand}>TOTAL</Text><Text style={[s.grand, { minWidth: 80, textAlign: 'right' }]}>{money(quote.total)}</Text></View>
    </View>
    {quote.notes && <View style={s.box}><Text style={s.label}>Scope / Notes</Text><Text>{quote.notes}</Text></View>}
    {quote.terms && <View style={s.box}><Text style={s.label}>Terms</Text><Text>{quote.terms}</Text></View>}
    <View style={s.footer}><Text>{company.name} - {company.email}</Text><Text>{quote.quoteRef}</Text><Text>Thank you for the opportunity to quote.</Text></View>
  </Page></Document>;
}
