import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer, Image } from '@react-pdf/renderer';
import { COMPANY, COMPANY_PHONE_LINE, COMPANY_SERVICES_LINE, CompanyData } from './company';
import { PDF_BRAND_BLUE, PDF_BRAND_BLUE_DARK, PDF_BRAND_BLUE_LIGHT, PDF_FONT_FAMILY, pdfLogoSource } from './brand';

const styles = StyleSheet.create({
  page: { padding: 38, paddingTop: 138, paddingBottom: 70, fontSize: 10, fontFamily: PDF_FONT_FAMILY, color: '#161616', lineHeight: 1.35 },
  supplementPage: { padding: 38, paddingBottom: 70, fontSize: 10, fontFamily: PDF_FONT_FAMILY, color: '#161616', lineHeight: 1.35 },
  topRule: { position: 'absolute', top: 32, left: 38, right: 38, height: 5, backgroundColor: PDF_BRAND_BLUE },
  supplementTopRule: { height: 5, backgroundColor: PDF_BRAND_BLUE, marginBottom: 14 },
  header: { position: 'absolute', top: 48, left: 38, right: 38, height: 76, borderBottom: `1 solid ${PDF_BRAND_BLUE_LIGHT}`, paddingBottom: 10 },
  supplementHeader: { borderBottom: `1 solid ${PDF_BRAND_BLUE_LIGHT}`, paddingBottom: 10, marginBottom: 16 },
  logo: { width: 118, height: 66, objectFit: 'contain' },
  coName: { fontSize: 12, fontWeight: 600, color: PDF_BRAND_BLUE },
  coMeta: { fontSize: 9, color: '#525252', marginTop: 2 },
  coServices: { fontSize: 8, color: '#525252', marginTop: 2, fontStyle: 'italic' },
  title: { fontSize: 22, lineHeight: 1.15, fontWeight: 700, color: PDF_BRAND_BLUE_DARK, marginTop: 10 },
  ref: { fontSize: 9, color: '#6f6f6f', marginTop: 6 },
  section: { marginTop: 14, marginBottom: 6 },
  secTitle: { fontSize: 10, fontWeight: 700, color: PDF_BRAND_BLUE, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, borderBottom: `1 solid ${PDF_BRAND_BLUE_LIGHT}`, paddingBottom: 4 },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 78, color: '#525252', fontSize: 9 },
  value: { flex: 1, fontSize: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  col: { width: '50%', marginBottom: 3 },
  tblHead: { flexDirection: 'row', backgroundColor: PDF_BRAND_BLUE, color: '#ffffff', padding: 5, marginTop: 4 },
  tblRow: { flexDirection: 'row', padding: 4, borderBottom: '0.5 solid #e0e0e0' },
  tblCell: { fontSize: 8 },
  desc: { fontSize: 9, lineHeight: 1.4, marginTop: 4 },
  signBox: { marginTop: 20, paddingTop: 6, borderTop: '1 solid #e0e0e0' },
  footer: {
    position: 'absolute', bottom: 18, left: 36, right: 36,
    borderTop: '1 solid #e0e0e0', paddingTop: 6,
    fontSize: 7, color: '#6f6f6f', textAlign: 'center',
  },
  status: {
    fontSize: 9, fontWeight: 700, padding: '3 8', color: '#24a148',
    backgroundColor: '#defbe6', alignSelf: 'flex-start', borderRadius: 10, letterSpacing: 0.5,
  },
});

// Job type comes from Prisma with fields we care about
export interface JobForPdf {
  id: string;
  jobCardRef: string;
  title: string;
  type: string;
  unitType: string;
  issue: string;
  priority: string;
  status: string;
  date: string;
  time: string;
  clockIn?: string | null;
  clockOut?: string | null;
  description: string;
  customer: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    siteAddress?: string | null;
  };
  technicians?: { name: string; phone?: string | null }[];
  coTechnicians?: { name: string }[];
  diagnostics?: {
    voltage?: string | null; current?: string | null;
    avgTemp?: string | null; maxTemp?: string | null;
    suction?: string | null; discharge?: string | null;
    deltaT?: string | null; brand?: string | null; serial?: string | null;
    refrigerantType?: string | null;
    refrigerantRecovered?: number | null;
    refrigerantUsed?: number | null;
    refrigerantReused?: number | null;
    status?: string | null;
    notes?: string | null;
  } | null;
  gasUsageRecords?: {
    gasType: string; quantityUsed: number; purpose?: string | null; date?: string | null;
  }[];
  consumables?: {
    name: string; quantity: number; unit?: string | null;
  }[];
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{String(value)}</Text>
    </View>
  );
}

function humanise(s: string): string {
  return s.replace(/_/g, ' ').replace(/-/g, ' ');
}

function formatDate(s?: string | null): string {
  if (!s) return '';
  const d = new Date(s.length <= 10 ? s + 'T12:00' : s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-ZA', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export function JobCardPdfDoc({ job, company: c }: { job: JobForPdf; company?: CompanyData }) {
  const address = job.customer.siteAddress || job.customer.address || '—';
  const leadTech = job.technicians?.[0]?.name || 'Not assigned';
  const coTechs = job.coTechnicians?.map(t => t.name).join(', ') || '';
  const co = c || { name: COMPANY.name, address: COMPANY.address, phone: COMPANY_PHONE_LINE, email: '', website: '', vatRate: 15.5, vatNumber: '', logoUrl: '', tagline: 'Air Conditioning & Refrigeration', services: COMPANY_SERVICES_LINE };
  const hasSupplement = Boolean(job.gasUsageRecords?.length || job.consumables?.length);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topRule} fixed />
        {/* ───── Company Header ───── */}
        <View style={styles.header} fixed>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image does not expose an alt prop */}
            <Image source={pdfLogoSource(co.logoUrl)} style={styles.logo} />
            <View>
              <Text style={styles.coName}>{co.name}</Text>
              <Text style={styles.coMeta}>Address: {co.address}</Text>
              <Text style={styles.coMeta}>Phone: {co.phone}</Text>
              <Text style={styles.coServices}>Our Services: {co.services}</Text>
            </View>
          </View>
        </View>

        {/* ───── Title + Ref ───── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={styles.title}>Job Card</Text>
            <Text style={styles.ref}>Ref: {job.jobCardRef}</Text>
          </View>
          <Text style={styles.status}>{humanise(job.status).toUpperCase()}</Text>
        </View>

        {/* ───── Customer ───── */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>Customer Details</Text>
          <Row label="Name" value={job.customer.name} />
          <Row label="Phone" value={job.customer.phone} />
          <Row label="Email" value={job.customer.email} />
          <Row label="Site address" value={address} />
        </View>

        {/* ───── Job ───── */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>Job Information</Text>
          <View style={styles.grid}>
            <View style={styles.col}><Row label="Title" value={job.title} /></View>
            <View style={styles.col}><Row label="Type" value={humanise(job.type)} /></View>
            <View style={styles.col}><Row label="Unit type" value={humanise(job.unitType)} /></View>
            <View style={styles.col}><Row label="Issue" value={humanise(job.issue)} /></View>
            <View style={styles.col}><Row label="Priority" value={humanise(job.priority)} /></View>
            <View style={styles.col}><Row label="Scheduled" value={`${formatDate(job.date)} at ${job.time}`} /></View>
            <View style={styles.col}><Row label="Clock in" value={job.clockIn} /></View>
            <View style={styles.col}><Row label="Clock out" value={job.clockOut} /></View>
          </View>
          <View style={{ marginTop: 6 }}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.desc}>{job.description || '—'}</Text>
          </View>
        </View>

        {/* ───── Technicians ───── */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>Technicians</Text>
          <Row label="Lead technician" value={leadTech} />
          {coTechs && <Row label="Co-technicians" value={coTechs} />}
        </View>

        {/* ───── Diagnostics ───── */}
        {job.diagnostics && (
          <View style={styles.section}>
            <Text style={styles.secTitle}>Diagnostics</Text>
            <View style={styles.grid}>
              <View style={styles.col}><Row label="Brand" value={job.diagnostics.brand} /></View>
              <View style={styles.col}><Row label="Serial" value={job.diagnostics.serial} /></View>
              <View style={styles.col}><Row label="Voltage" value={job.diagnostics.voltage} /></View>
              <View style={styles.col}><Row label="Current" value={job.diagnostics.current} /></View>
              <View style={styles.col}><Row label="Avg temp" value={job.diagnostics.avgTemp} /></View>
              <View style={styles.col}><Row label="Max temp" value={job.diagnostics.maxTemp} /></View>
              <View style={styles.col}><Row label="Suction" value={job.diagnostics.suction} /></View>
              <View style={styles.col}><Row label="Discharge" value={job.diagnostics.discharge} /></View>
              <View style={styles.col}><Row label="Delta T" value={job.diagnostics.deltaT} /></View>
              <View style={styles.col}><Row label="System status" value={job.diagnostics.status} /></View>
              <View style={styles.col}><Row label="Refrigerant" value={job.diagnostics.refrigerantType} /></View>
              <View style={styles.col}><Row label="Recovered (kg)" value={job.diagnostics.refrigerantRecovered} /></View>
              <View style={styles.col}><Row label="Used (kg)" value={job.diagnostics.refrigerantUsed} /></View>
              <View style={styles.col}><Row label="Reused (kg)" value={job.diagnostics.refrigerantReused} /></View>
            </View>
            {job.diagnostics.notes && (
              <View style={{ marginTop: 6 }}>
                <Text style={styles.label}>Diagnostic notes</Text>
                <Text style={styles.desc}>{job.diagnostics.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* ───── Gas Usage ───── */}
        {!hasSupplement && job.gasUsageRecords && job.gasUsageRecords.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.secTitle}>Refrigerant Usage</Text>
            <View style={styles.tblHead}>
              <Text style={[styles.tblCell, { flex: 1, fontWeight: 700, color: '#fff' }]}>Gas type</Text>
              <Text style={[styles.tblCell, { width: 80, fontWeight: 700, color: '#fff' }]}>Quantity (kg)</Text>
              <Text style={[styles.tblCell, { flex: 2, fontWeight: 700, color: '#fff' }]}>Purpose</Text>
              <Text style={[styles.tblCell, { width: 80, fontWeight: 700, color: '#fff' }]}>Date</Text>
            </View>
            {job.gasUsageRecords.map((g, i) => (
              <View key={i} style={styles.tblRow}>
                <Text style={[styles.tblCell, { flex: 1 }]}>{g.gasType}</Text>
                <Text style={[styles.tblCell, { width: 80 }]}>{g.quantityUsed}</Text>
                <Text style={[styles.tblCell, { flex: 2 }]}>{g.purpose || '—'}</Text>
                <Text style={[styles.tblCell, { width: 80 }]}>{g.date || '—'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ───── Consumables ───── */}
        {!hasSupplement && job.consumables && job.consumables.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.secTitle}>Materials Used</Text>
            <View style={styles.tblHead}>
              <Text style={[styles.tblCell, { flex: 2, fontWeight: 700, color: '#fff' }]}>Item</Text>
              <Text style={[styles.tblCell, { width: 80, fontWeight: 700, color: '#fff' }]}>Quantity</Text>
              <Text style={[styles.tblCell, { width: 80, fontWeight: 700, color: '#fff' }]}>Unit</Text>
            </View>
            {job.consumables.map((c, i) => (
              <View key={i} style={styles.tblRow}>
                <Text style={[styles.tblCell, { flex: 2 }]}>{c.name}</Text>
                <Text style={[styles.tblCell, { width: 80 }]}>{c.quantity}</Text>
                <Text style={[styles.tblCell, { width: 80 }]}>{c.unit || '—'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ───── Signature ───── */}
        {!hasSupplement && <View style={styles.signBox}>
          <Text style={[styles.label, { marginBottom: 20 }]}>Customer signature</Text>
          <View style={{ borderBottom: '1 solid #161616', width: 200 }} />
          <Text style={{ fontSize: 8, color: '#6f6f6f', marginTop: 4 }}>
            Signed on: {new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}
          </Text>
        </View>}

        {/* ───── Footer ───── */}
        <View style={styles.footer} fixed>
          <Text>{co.name} · {co.address} · {co.phone}</Text>
          <Text>{co.services}</Text>
        </View>
      </Page>

      {hasSupplement && <Page size="A4" style={styles.supplementPage}>
        <View style={styles.supplementTopRule} />
        <View style={styles.supplementHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image does not expose an alt prop */}
            <Image source={pdfLogoSource(co.logoUrl)} style={styles.logo} />
            <View>
              <Text style={styles.coName}>{co.name}</Text>
              <Text style={styles.coMeta}>Address: {co.address}</Text>
              <Text style={styles.coMeta}>Phone: {co.phone}</Text>
              <Text style={styles.coServices}>Our Services: {co.services}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.title, { fontSize: 17 }]}>Service & Materials Record</Text>
        <Text style={styles.ref}>Job card: {job.jobCardRef}</Text>

        {job.gasUsageRecords && job.gasUsageRecords.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.secTitle}>Refrigerant Usage</Text>
            <View style={styles.tblHead}>
              <Text style={[styles.tblCell, { flex: 1, fontWeight: 700, color: '#fff' }]}>Gas type</Text>
              <Text style={[styles.tblCell, { width: 80, fontWeight: 700, color: '#fff' }]}>Quantity (kg)</Text>
              <Text style={[styles.tblCell, { flex: 2, fontWeight: 700, color: '#fff' }]}>Purpose</Text>
              <Text style={[styles.tblCell, { width: 80, fontWeight: 700, color: '#fff' }]}>Date</Text>
            </View>
            {job.gasUsageRecords.map((g, i) => (
              <View key={i} style={styles.tblRow}>
                <Text style={[styles.tblCell, { flex: 1 }]}>{g.gasType}</Text>
                <Text style={[styles.tblCell, { width: 80 }]}>{g.quantityUsed}</Text>
                <Text style={[styles.tblCell, { flex: 2 }]}>{g.purpose || '—'}</Text>
                <Text style={[styles.tblCell, { width: 80 }]}>{g.date || '—'}</Text>
              </View>
            ))}
          </View>
        )}

        {job.consumables && job.consumables.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.secTitle}>Materials Used</Text>
            <View style={styles.tblHead}>
              <Text style={[styles.tblCell, { flex: 2, fontWeight: 700, color: '#fff' }]}>Item</Text>
              <Text style={[styles.tblCell, { width: 80, fontWeight: 700, color: '#fff' }]}>Quantity</Text>
              <Text style={[styles.tblCell, { width: 80, fontWeight: 700, color: '#fff' }]}>Unit</Text>
            </View>
            {job.consumables.map((item, i) => (
              <View key={i} style={styles.tblRow}>
                <Text style={[styles.tblCell, { flex: 2 }]}>{item.name}</Text>
                <Text style={[styles.tblCell, { width: 80 }]}>{item.quantity}</Text>
                <Text style={[styles.tblCell, { width: 80 }]}>{item.unit || '—'}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.signBox}>
          <Text style={[styles.label, { marginBottom: 20 }]}>Customer signature</Text>
          <View style={{ borderBottom: '1 solid #161616', width: 200 }} />
          <Text style={{ fontSize: 8, color: '#6f6f6f', marginTop: 4 }}>
            Signed on: {new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>{co.name} · {co.address} · {co.phone}</Text>
          <Text>{co.services}</Text>
        </View>
      </Page>}
    </Document>
  );
}

/**
 * Generate a Job Card PDF as a Buffer, ready for email attachment or HTTP download.
 */
export async function generateJobCardPdf(job: JobForPdf, company?: CompanyData): Promise<Buffer> {
  return await renderToBuffer(<JobCardPdfDoc job={job} company={company} />);
}
