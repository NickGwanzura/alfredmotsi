import { NextRequest, NextResponse } from 'next/server';
import { serviceSession, FIELD_ROLES } from '@/app/lib/serviceAuth';
import { prisma } from '@/app/lib/db';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { FALLBACK, loadCompany } from '@/app/lib/pdf/company';
import type { CompanyData } from '@/app/lib/pdf/company';
import { PDF_BRAND_BLUE, PDF_BRAND_BLUE_DARK, PDF_BRAND_BLUE_LIGHT, PDF_FONT_FAMILY, pdfLogoSource } from '@/app/lib/pdf/brand';

interface GasUsageRecord {
  id: string;
  gasType: string;
  quantityUsed: number;
  quantityKg: number;
  unit: string;
  movementType: string;
  usedByName: string;
  jobRef: string;
  stockRef: string;
  customer: string;
  date: string;
  time: string;
  purpose: string;
  reversedAt: Date | null;
}

const styles = StyleSheet.create({
  page: { padding: 38, paddingTop: 32, fontSize: 9, fontFamily: PDF_FONT_FAMILY, color: '#161616', lineHeight: 1.35 },
  topRule: { height: 5, backgroundColor: PDF_BRAND_BLUE, marginBottom: 14 },
  header: { borderBottom: `1 solid ${PDF_BRAND_BLUE_LIGHT}`, paddingBottom: 12, marginBottom: 16 },
  logo: { width: 118, height: 66, objectFit: 'contain' },
  coName: { fontSize: 12, fontWeight: 600, color: PDF_BRAND_BLUE },
  coMeta: { fontSize: 9, color: '#525252', marginTop: 2 },
  title: { fontSize: 22, lineHeight: 1.15, fontWeight: 700, color: PDF_BRAND_BLUE_DARK, marginTop: 10 },
  subtitle: { fontSize: 10, color: '#6f6f6f', marginTop: 7, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', marginBottom: 4 },
  summaryLabel: { width: 100, color: '#525252', fontSize: 9 },
  summaryValue: { fontSize: 9, fontWeight: 700 },
  tblHead: { flexDirection: 'row', backgroundColor: PDF_BRAND_BLUE, color: '#fff', padding: '7 8', marginTop: 8 },
  tblRow: { flexDirection: 'row', padding: '6 8', borderBottom: '0.5 solid #e0e0e0' },
  tblCell: { fontSize: 8 },
  footer: { position: 'absolute', bottom: 18, left: 36, right: 36, borderTop: '1 solid #e0e0e0', paddingTop: 6, fontSize: 7, color: '#6f6f6f', textAlign: 'center' },
});

export function GasUsagePdfDoc({ usage, dateStr, company: c }: { usage: GasUsageRecord[]; dateStr: string; company?: CompanyData }) {
  const active = usage.filter(r => !r.reversedAt && ['used', 'reused', 'recovered'].includes(r.movementType));
  const totalKg = active.reduce((s, r) => s + r.quantityKg, 0);
  const co = c || FALLBACK;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topRule} fixed />
        <View style={styles.header} fixed>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image does not expose an alt prop */}
            <Image source={pdfLogoSource(co.logoUrl)} style={styles.logo} />
            <View>
              <Text style={styles.coName}>{co.name}</Text>
              <Text style={styles.coMeta}>Gas Usage Report — Generated {dateStr}</Text>
              <Text style={styles.coMeta}>{co.address} · {co.phone}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.title}>Refrigerant Gas Usage Log</Text>
        <Text style={styles.subtitle}>{usage.length} records · {totalKg.toFixed(2)} kg total</Text>

        {/* Summary stats */}
        <View style={{ flexDirection: 'row', marginBottom: 12, gap: 24 }}>
          <View style={{ flex: 1, backgroundColor: PDF_BRAND_BLUE_LIGHT, padding: 9 }}>
            <Text style={{ fontSize: 8, color: '#6f6f6f', marginBottom: 2 }}>Total Records</Text>
            <Text style={{ fontSize: 14, fontWeight: 700, color: '#093a68' }}>{usage.length}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: PDF_BRAND_BLUE_LIGHT, padding: 9 }}>
            <Text style={{ fontSize: 8, color: '#6f6f6f', marginBottom: 2 }}>Total Quantity</Text>
            <Text style={{ fontSize: 14, fontWeight: 700, color: '#093a68' }}>{totalKg.toFixed(2)} kg</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: PDF_BRAND_BLUE_LIGHT, padding: 9 }}>
            <Text style={{ fontSize: 8, color: '#6f6f6f', marginBottom: 2 }}>Unique Customers</Text>
            <Text style={{ fontSize: 14, fontWeight: 700, color: '#093a68' }}>{new Set(usage.map(r => r.customer)).size}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.tblHead}>
          <Text style={[styles.tblCell, { flex: 1.2, fontWeight: 700, color: '#fff' }]}>Date</Text>
          <Text style={[styles.tblCell, { width: 52, fontWeight: 700, color: '#fff' }]}>Movement</Text>
          <Text style={[styles.tblCell, { width: 46, fontWeight: 700, color: '#fff' }]}>Gas</Text>
          <Text style={[styles.tblCell, { width: 45, fontWeight: 700, color: '#fff' }]}>kg</Text>
          <Text style={[styles.tblCell, { flex: 1, fontWeight: 700, color: '#fff' }]}>Technician</Text>
          <Text style={[styles.tblCell, { width: 58, fontWeight: 700, color: '#fff' }]}>Job</Text>
          <Text style={[styles.tblCell, { flex: 1, fontWeight: 700, color: '#fff' }]}>Customer</Text>
          <Text style={[styles.tblCell, { flex: 1.2, fontWeight: 700, color: '#fff' }]}>Purpose / Stock</Text>
        </View>
        {usage.map(r => (
          <View key={r.id} style={styles.tblRow} wrap={false}>
            <Text style={[styles.tblCell, { flex: 1.2 }]}>{r.date} {r.time}</Text>
            <Text style={[styles.tblCell, { width: 52 }]}>{r.movementType}{r.reversedAt ? ' (reversed)' : ''}</Text>
            <Text style={[styles.tblCell, { width: 46 }]}>{r.gasType}</Text>
            <Text style={[styles.tblCell, { width: 45 }]}>{r.quantityKg.toFixed(3)}</Text>
            <Text style={[styles.tblCell, { flex: 1 }]}>{r.usedByName}</Text>
            <Text style={[styles.tblCell, { width: 58 }]}>{r.jobRef}</Text>
            <Text style={[styles.tblCell, { flex: 1 }]}>{r.customer}</Text>
            <Text style={[styles.tblCell, { flex: 1.2 }]}>{r.purpose || '—'} · {r.stockRef}</Text>
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>{co.name} · Gas Usage Report · {co.website}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function POST(req: NextRequest) {
  const { session, error } = await serviceSession(FIELD_ROLES);
  if (error) return error;

  const { usage, fromDate, toDate } = await req.json();
  const ids = Array.isArray(usage)
    ? [...new Set(usage.map((record: unknown) => (record && typeof record === 'object' && 'id' in record ? record.id : null)).filter((id): id is string => typeof id === 'string' && id.trim().length > 0))]
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: 'No usage data provided' }, { status: 400 });
  }
  if (ids.length > 1000) {
    return NextResponse.json({ error: 'A single PDF is limited to 1,000 records. Select a shorter reporting period.' }, { status: 413 });
  }
  const from = typeof fromDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fromDate) ? fromDate : null;
  const to = typeof toDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(toDate) ? toDate : null;
  if ((fromDate && !from) || (toDate && !to) || (from && to && from > to)) {
    return NextResponse.json({ error: 'Invalid reporting period' }, { status: 400 });
  }

  const role = session!.user.role as string;
  const records = await prisma.gasUsageRecord.findMany({
    where: {
      id: { in: ids },
      ...(from || to ? { date: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {}),
      ...(role === 'tech' ? {
        job: { OR: [{ technicians: { some: { id: session!.user.id } } }, { coTechnicians: { some: { id: session!.user.id } } }] },
      } : {}),
    },
    select: {
      id: true, gasType: true, quantityUsed: true, quantityKg: true, unit: true,
      movementType: true, usedByName: true, customer: true, date: true, time: true,
      purpose: true, reversedAt: true,
      stockSerialNumber: true,
      job: { select: { jobCardRef: true } },
      stockItem: { select: { serialNumber: true, supplierRef: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (records.length === 0) return NextResponse.json({ error: 'No accessible usage records found' }, { status: 404 });

  const reportUsage: GasUsageRecord[] = records.map(({ job, stockItem, ...record }) => ({
    ...record,
    movementType: record.movementType,
    jobRef: job?.jobCardRef || '—',
    stockRef: record.stockSerialNumber || stockItem?.serialNumber || stockItem?.supplierRef || '—',
  }));

  const dateStr = new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });
  const company = await loadCompany();
  const buffer = await renderToBuffer(<GasUsagePdfDoc usage={reportUsage} dateStr={dateStr} company={company} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="gas-usage-report-${new Date().toISOString().split('T')[0]}.pdf"`,
    },
  });
}
