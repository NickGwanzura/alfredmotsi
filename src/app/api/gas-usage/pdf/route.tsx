import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { loadCompany } from '@/app/lib/pdf/company';

interface GasUsageRecord {
  id: string;
  gasType: string;
  quantityUsed: number;
  usedBy: string;
  jobId: string;
  customer: string;
  date: string;
  time: string;
  purpose: string;
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: 'Helvetica', color: '#161616' },
  header: { borderBottom: '2 solid #093a68', paddingBottom: 10, marginBottom: 16 },
  coName: { fontSize: 18, fontWeight: 700, color: '#093a68' },
  coMeta: { fontSize: 9, color: '#525252', marginTop: 2 },
  title: { fontSize: 14, fontWeight: 700, marginTop: 14, marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#6f6f6f', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', marginBottom: 4 },
  summaryLabel: { width: 100, color: '#525252', fontSize: 9 },
  summaryValue: { fontSize: 9, fontWeight: 700 },
  tblHead: { flexDirection: 'row', backgroundColor: '#f4f4f4', padding: '6 8', marginTop: 8, borderBottom: '1 solid #d1d1d1' },
  tblRow: { flexDirection: 'row', padding: '6 8', borderBottom: '0.5 solid #e0e0e0' },
  tblCell: { fontSize: 8 },
  footer: { position: 'absolute', bottom: 18, left: 36, right: 36, borderTop: '1 solid #e0e0e0', paddingTop: 6, fontSize: 7, color: '#6f6f6f', textAlign: 'center' },
});

function GasUsagePdfDoc({ usage, dateStr, company: c }: { usage: GasUsageRecord[]; dateStr: string; company?: any }) {
  const totalKg = usage.reduce((s, r) => s + r.quantityUsed, 0);
  const co = c || { name: 'Splash Air', address: '', phone: '', tagline: 'Air Conditioning & Refrigeration', website: '' };
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {co.logoUrl ? (
              <Image source={{ uri: co.logoUrl, method: 'GET', headers: { Accept: 'image/*' } }} style={{ width: 28, height: 28 }} />
            ) : null}
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
          <View style={{ flex: 1, backgroundColor: '#f9fafb', padding: 8 }}>
            <Text style={{ fontSize: 8, color: '#6f6f6f', marginBottom: 2 }}>Total Records</Text>
            <Text style={{ fontSize: 14, fontWeight: 700, color: '#093a68' }}>{usage.length}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#f9fafb', padding: 8 }}>
            <Text style={{ fontSize: 8, color: '#6f6f6f', marginBottom: 2 }}>Total Quantity</Text>
            <Text style={{ fontSize: 14, fontWeight: 700, color: '#093a68' }}>{totalKg.toFixed(2)} kg</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#f9fafb', padding: 8 }}>
            <Text style={{ fontSize: 8, color: '#6f6f6f', marginBottom: 2 }}>Unique Customers</Text>
            <Text style={{ fontSize: 14, fontWeight: 700, color: '#093a68' }}>{new Set(usage.map(r => r.customer)).size}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.tblHead}>
          <Text style={[styles.tblCell, { flex: 1.2, fontWeight: 700 }]}>Date</Text>
          <Text style={[styles.tblCell, { flex: 1, fontWeight: 700 }]}>Gas Type</Text>
          <Text style={[styles.tblCell, { width: 60, fontWeight: 700 }]}>Qty (kg)</Text>
          <Text style={[styles.tblCell, { flex: 1.2, fontWeight: 700 }]}>Customer</Text>
          <Text style={[styles.tblCell, { flex: 1.5, fontWeight: 700 }]}>Purpose</Text>
        </View>
        {usage.map(r => (
          <View key={r.id} style={styles.tblRow} wrap={false}>
            <Text style={[styles.tblCell, { flex: 1.2 }]}>{r.date} {r.time}</Text>
            <Text style={[styles.tblCell, { flex: 1 }]}>{r.gasType}</Text>
            <Text style={[styles.tblCell, { width: 60 }]}>{r.quantityUsed.toFixed(2)}</Text>
            <Text style={[styles.tblCell, { flex: 1.2 }]}>{r.customer}</Text>
            <Text style={[styles.tblCell, { flex: 1.5 }]}>{r.purpose || '—'}</Text>
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
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { usage } = await req.json();
  if (!Array.isArray(usage) || usage.length === 0) {
    return NextResponse.json({ error: 'No usage data provided' }, { status: 400 });
  }

  const dateStr = new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });
  const company = await loadCompany();
  const buffer = await renderToBuffer(<GasUsagePdfDoc usage={usage as GasUsageRecord[]} dateStr={dateStr} company={company} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="gas-usage-report-${new Date().toISOString().split('T')[0]}.pdf"`,
    },
  });
}
