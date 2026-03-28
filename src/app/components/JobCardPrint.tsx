'use client';

import React from 'react';
import { Job, Customer, User } from '@/app/types';
import { STATUS_CFG } from '@/app/lib/config';
import { fmtDate } from '@/app/lib/utils';

interface JobCardPrintProps {
  job: Job;
  customer: Customer | undefined;
  technician: User | undefined;
  onClose: () => void;
}

export default function JobCardPrint({ job, customer, technician, onClose }: JobCardPrintProps) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) return;

    const statusConfig = STATUS_CFG[job.status];
    const diag = job.diagnostics;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Job Card - ${job.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
          
          * { box-sizing: border-box; margin: 0; padding: 0; }
          
          body {
            font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
            font-size: 12px;
            line-height: 1.5;
            color: #161616;
            background: #fff;
            padding: 40px;
          }
          
          .print-container {
            max-width: 700px;
            margin: 0 auto;
          }
          
          /* Header */
          .print-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 32px;
            padding-bottom: 24px;
            border-bottom: 2px solid #0f62fe;
          }
          
          .print-logo {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .print-logo-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #0f62fe, #0043ce);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: 300;
          }
          
          .print-logo-text {
            font-size: 24px;
            font-weight: 300;
            color: #161616;
            letter-spacing: -0.5px;
          }
          
          .print-logo-tagline {
            font-size: 11px;
            color: #525252;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          
          .print-job-info {
            text-align: right;
          }
          
          .print-job-number {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 18px;
            font-weight: 500;
            color: #0f62fe;
            margin-bottom: 4px;
          }
          
          .print-job-date {
            font-size: 12px;
            color: #525252;
          }
          
          /* Sections */
          .print-section {
            margin-bottom: 24px;
            padding: 16px;
            border: 1px solid #e0e0e0;
            background: #fafafa;
          }
          
          .print-section-title {
            font-size: 11px;
            font-weight: 600;
            color: #161616;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e0e0e0;
          }
          
          /* Info Grid */
          .print-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px 32px;
          }
          
          .print-info-item {
            display: flex;
            flex-direction: column;
          }
          
          .print-info-label {
            font-size: 10px;
            color: #6f6f6f;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 2px;
          }
          
          .print-info-value {
            font-size: 13px;
            color: #161616;
            font-weight: 500;
          }
          
          .print-info-value-lg {
            font-size: 14px;
            font-weight: 600;
          }
          
          /* Status Badge */
          .print-status {
            display: inline-block;
            padding: 4px 12px;
            font-size: 11px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            background: ${statusConfig?.bg || '#e0e0e0'};
            color: ${statusConfig?.txt || '#161616'};
            border-radius: 0;
          }
          
          /* Description */
          .print-description {
            font-size: 12px;
            color: #525252;
            line-height: 1.6;
            white-space: pre-wrap;
          }
          
          /* Diagnostics Table */
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          
          .print-table th {
            text-align: left;
            padding: 8px 12px;
            font-size: 10px;
            font-weight: 600;
            color: #161616;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            background: #f0f0f0;
            border-bottom: 2px solid #d1d1d1;
          }
          
          .print-table td {
            padding: 10px 12px;
            font-size: 12px;
            border-bottom: 1px solid #e0e0e0;
            font-family: 'IBM Plex Mono', monospace;
          }
          
          .print-table tr:last-child td {
            border-bottom: none;
          }
          
          /* ODS Section */
          .print-ods-section {
            margin-top: 16px;
            padding: 16px;
            background: linear-gradient(135deg, #e0f2f1, #f1f8f7);
            border: 1px solid #80cbc4;
            border-left: 4px solid #00695c;
          }
          
          .print-ods-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
          }
          
          .print-ods-icon {
            width: 24px;
            height: 24px;
            background: #00695c;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
          }
          
          .print-ods-title {
            font-size: 12px;
            font-weight: 600;
            color: #004d40;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          
          .print-ods-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
          
          .print-ods-item {
            text-align: center;
            padding: 12px;
            background: rgba(255,255,255,0.7);
            border: 1px solid #b2dfdb;
          }
          
          .print-ods-value {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 18px;
            font-weight: 500;
            color: #00695c;
          }
          
          .print-ods-label {
            font-size: 9px;
            color: #004d40;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-top: 4px;
          }
          
          .print-ods-note {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #b2dfdb;
            font-size: 10px;
            color: #00695c;
            font-style: italic;
          }
          
          /* Signatures */
          .print-signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
            margin-top: 32px;
            page-break-inside: avoid;
          }
          
          .print-signature-box {
            border: 1px solid #d1d1d1;
            padding: 16px;
            background: #fff;
          }
          
          .print-signature-label {
            font-size: 10px;
            color: #6f6f6f;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 40px;
          }
          
          .print-signature-line {
            border-bottom: 1px solid #161616;
            margin-bottom: 8px;
            height: 40px;
            display: flex;
            align-items: flex-end;
          }
          
          .print-signature-img {
            max-height: 36px;
            max-width: 100%;
          }
          
          .print-signature-name {
            font-size: 12px;
            font-weight: 600;
            color: #161616;
          }
          
          .print-signature-date {
            font-size: 10px;
            color: #525252;
            margin-top: 4px;
          }
          
          /* Footer */
          .print-footer {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            font-size: 10px;
            color: #6f6f6f;
          }
          
          .print-footer-contact {
            margin-top: 4px;
          }
          
          /* Print styles */
          @media print {
            body { padding: 20px; }
            .print-section { break-inside: avoid; }
            .print-ods-section { break-inside: avoid; }
            .print-signatures { break-inside: avoid; }
          }
          
          /* Alerts */
          .print-alert {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            font-size: 10px;
            font-weight: 500;
            background: #fff1f1;
            color: #da1e28;
            margin-left: 8px;
          }
          
          .no-data {
            color: #a8a8a8;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <!-- Header -->
          <div class="print-header">
            <div class="print-logo">
              <div class="print-logo-icon">❄</div>
              <div>
                <div class="print-logo-text">Splash Air</div>
                <div class="print-logo-tagline">Air Conditioning Specialists</div>
              </div>
            </div>
            <div class="print-job-info">
              <div class="print-job-number">${job.jobCardRef || job.id}</div>
              <div class="print-job-date">${fmtDate(job.date)} at ${job.time}</div>
              <div style="margin-top: 8px;">
                <span class="print-status">${statusConfig?.label || job.status}</span>
              </div>
            </div>
          </div>
          
          <!-- Customer Details -->
          <div class="print-section">
            <div class="print-section-title">Customer Details</div>
            <div class="print-info-grid">
              <div class="print-info-item">
                <span class="print-info-label">Customer Name</span>
                <span class="print-info-value print-info-value-lg">${customer?.name || 'N/A'}</span>
              </div>
              <div class="print-info-item">
                <span class="print-info-label">Contact Number</span>
                <span class="print-info-value">${customer?.phone || 'N/A'}</span>
              </div>
              <div class="print-info-item">
                <span class="print-info-label">Site Address</span>
                <span class="print-info-value">${customer?.siteAddress || customer?.address || 'N/A'}</span>
              </div>
              <div class="print-info-item">
                <span class="print-info-label">Email</span>
                <span class="print-info-value">${customer?.email || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <!-- Job Details -->
          <div class="print-section">
            <div class="print-section-title">Job Details</div>
            <div class="print-info-grid">
              <div class="print-info-item">
                <span class="print-info-label">Job Title</span>
                <span class="print-info-value print-info-value-lg">${job.title}</span>
              </div>
              <div class="print-info-item">
                <span class="print-info-label">Job Type</span>
                <span class="print-info-value">${job.type.charAt(0).toUpperCase() + job.type.slice(1)}</span>
              </div>
              <div class="print-info-item">
                <span class="print-info-label">Unit Type</span>
                <span class="print-info-value">${job.unitType}</span>
              </div>
              <div class="print-info-item">
                <span class="print-info-label">Priority</span>
                <span class="print-info-value">${job.priority.toUpperCase()}</span>
              </div>
              <div class="print-info-item">
                <span class="print-info-label">Technician</span>
                <span class="print-info-value">${technician?.name || 'Unassigned'}</span>
              </div>
              <div class="print-info-item">
                <span class="print-info-label">Issue Type</span>
                <span class="print-info-value">${job.issue.charAt(0).toUpperCase() + job.issue.slice(1)}</span>
              </div>
            </div>
            
            <div style="margin-top: 16px;">
              <span class="print-info-label">Description</span>
              <p class="print-description">${job.description || 'No description provided.'}</p>
            </div>
          </div>
          
          ${diag ? `
          <!-- Technical Diagnostics -->
          <div class="print-section">
            <div class="print-section-title">Technical Diagnostic Readings</div>
            
            <table class="print-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Value</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Supply Voltage</td>
                  <td>${diag.voltage || '<span class="no-data">--</span>'}</td>
                  <td>V</td>
                </tr>
                <tr>
                  <td>Current Draw</td>
                  <td>${diag.current || '<span class="no-data">--</span>'}</td>
                  <td>A</td>
                </tr>
                <tr>
                  <td>Avg Operating Temp</td>
                  <td>${diag.avgTemp || '<span class="no-data">--</span>'}</td>
                  <td>°C</td>
                </tr>
                <tr>
                  <td>Max Design Temp</td>
                  <td>${diag.maxTemp || '<span class="no-data">--</span>'}</td>
                  <td>°C</td>
                </tr>
                <tr>
                  <td>Delta T</td>
                  <td>${diag.deltaT || '<span class="no-data">--</span>'}</td>
                  <td>°C</td>
                </tr>
                <tr>
                  <td>Suction Pressure</td>
                  <td>${diag.suction || '<span class="no-data">--</span>'}</td>
                  <td>PSI</td>
                </tr>
                <tr>
                  <td>Discharge Pressure</td>
                  <td>${diag.discharge || '<span class="no-data">--</span>'}</td>
                  <td>PSI</td>
                </tr>
              </tbody>
            </table>
            
            ${diag.brand || diag.serial || diag.unitType ? `
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
              <div class="print-info-grid">
                ${diag.unitType ? `
                <div class="print-info-item">
                  <span class="print-info-label">Machine Type</span>
                  <span class="print-info-value">${diag.unitType}</span>
                </div>
                ` : ''}
                ${diag.brand ? `
                <div class="print-info-item">
                  <span class="print-info-label">Brand / Model</span>
                  <span class="print-info-value">${diag.brand}</span>
                </div>
                ` : ''}
                ${diag.serial ? `
                <div class="print-info-item">
                  <span class="print-info-label">Serial Number</span>
                  <span class="print-info-value" style="font-family: 'IBM Plex Mono', monospace;">${diag.serial}</span>
                </div>
                ` : ''}
                ${diag.status ? `
                <div class="print-info-item">
                  <span class="print-info-label">System Status</span>
                  <span class="print-info-value" style="text-transform: uppercase;">${diag.status}</span>
                </div>
                ` : ''}
              </div>
            </div>
            ` : ''}
            
            ${diag.notes ? `
            <div style="margin-top: 16px; padding: 12px; background: #fff; border-left: 3px solid #0f62fe;">
              <span class="print-info-label">Technician Notes</span>
              <p class="print-description" style="margin-top: 4px;">${diag.notes}</p>
            </div>
            ` : ''}
          </div>
          
          <!-- ODS / Refrigerant Data -->
          ${diag.refrigerantType || diag.refrigerantUsed || diag.refrigerantRecovered ? `
          <div class="print-ods-section">
            <div class="print-ods-header">
              <div class="print-ods-icon">🌿</div>
              <span class="print-ods-title">ODS & Refrigerant Tracking</span>
            </div>
            
            <div style="margin-bottom: 12px;">
              <span class="print-info-label">Refrigerant Type</span>
              <span class="print-info-value print-info-value-lg" style="color: #004d40; margin-left: 12px;">${diag.refrigerantType || 'N/A'}</span>
            </div>
            
            <div class="print-ods-grid">
              <div class="print-ods-item">
                <div class="print-ods-value">${diag.refrigerantRecovered?.toFixed(1) || '0.0'}</div>
                <div class="print-ods-label">Recovered (kg)</div>
              </div>
              <div class="print-ods-item">
                <div class="print-ods-value">${diag.refrigerantUsed?.toFixed(1) || '0.0'}</div>
                <div class="print-ods-label">Used (kg)</div>
              </div>
              <div class="print-ods-item">
                <div class="print-ods-value">${diag.refrigerantReused?.toFixed(1) || '0.0'}</div>
                <div class="print-ods-label">Reused (kg)</div>
              </div>
            </div>
            
            <div class="print-ods-note">
              All refrigerant handling complies with the Montreal Protocol and local environmental regulations.
              ${diag.refrigerantType?.startsWith('R-22') ? 'Class I ODS (HCFC) - Phase-out in progress.' : ''}
            </div>
          </div>
          ` : ''}
          ` : ''}
          
          <!-- Time Tracking -->
          ${job.clockIn || job.clockOut ? `
          <div class="print-section" style="break-inside: avoid;">
            <div class="print-section-title">Time Tracking</div>
            <div class="print-info-grid" style="grid-template-columns: repeat(3, 1fr);">
              <div class="print-info-item">
                <span class="print-info-label">Clock In</span>
                <span class="print-info-value" style="font-family: 'IBM Plex Mono', monospace;">${job.clockIn || '--:--'}</span>
              </div>
              <div class="print-info-item">
                <span class="print-info-label">Clock Out</span>
                <span class="print-info-value" style="font-family: 'IBM Plex Mono', monospace;">${job.clockOut || '--:--'}</span>
              </div>
              <div class="print-info-item">
                <span class="print-info-label">Duration</span>
                <span class="print-info-value" style="font-family: 'IBM Plex Mono', monospace;">
                  ${job.clockIn && job.clockOut ? (() => {
                    const [ih, im] = job.clockIn!.split(':').map(Number);
                    const [oh, om] = job.clockOut!.split(':').map(Number);
                    const mn = (oh * 60 + om) - (ih * 60 + im);
                    return `${Math.floor(mn / 60)}h ${mn % 60}m`;
                  })() : '--'}
                </span>
              </div>
            </div>
          </div>
          ` : ''}
          
          <!-- Signatures -->
          <div class="print-signatures">
            <div class="print-signature-box">
              <div class="print-signature-label">Technician Signature</div>
              <div class="print-signature-line">
                ${technician ? `<span style="color: #161616; font-weight: 500;">${technician.name}</span>` : ''}
              </div>
              <div class="print-signature-name">${technician?.name || '____________________'}</div>
              <div class="print-signature-date">Date: ${job.clockOut ? fmtDate(job.date) : '____________________'}</div>
            </div>
            
            <div class="print-signature-box">
              <div class="print-signature-label">Customer Signature</div>
              <div class="print-signature-line">
                ${job.signature ? `<img src="${job.signature}" class="print-signature-img" alt="Customer Signature" />` : ''}
              </div>
              <div class="print-signature-name">${customer?.name || '____________________'}</div>
              <div class="print-signature-date">Date: ${job.signature ? fmtDate(job.date) : '____________________'}</div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="print-footer">
            <div>Thank you for choosing Splash Air Conditioning</div>
            <div class="print-footer-contact">For support call: 011 000 0001 | Email: info@splashair.co.za</div>
            <div style="margin-top: 8px; font-family: 'IBM Plex Mono', monospace; font-size: 9px; color: #a8a8a8;">
              Job ID: ${job.id} | Generated: ${new Date().toLocaleDateString('en-ZA')}
            </div>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const statusConfig = STATUS_CFG[job.status];

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-hdr">
          <div>
            <p className="modal-lbl">Print Preview</p>
            <h2 className="modal-title">Job Card: {job.jobCardRef || job.id}</h2>
          </div>
          <button className="x-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="fi-anim">
            {/* Preview Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: 'var(--s6)',
              paddingBottom: 'var(--s5)',
              borderBottom: '2px solid var(--bi)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  background: 'linear-gradient(135deg, #0f62fe, #0043ce)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 24
                }}>
                  ❄
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 300 }}>Splash Air</div>
                  <div style={{ fontSize: 11, color: 'var(--ts)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Air Conditioning Specialists
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 18, fontWeight: 500, color: 'var(--bi)' }}>
                  {job.jobCardRef || job.id}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ts)' }}>
                  {fmtDate(job.date)} at {job.time}
                </div>
                <div style={{ marginTop: 8 }}>
                  <span className="tag" style={{ 
                    background: statusConfig?.bg, 
                    color: statusConfig?.txt 
                  }}>
                    {statusConfig?.label || job.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer & Job Summary */}
            <div className="tile" style={{ marginBottom: 'var(--s5)' }}>
              <div className="g2">
                <div>
                  <p className="sec-title">Customer</p>
                  <p style={{ fontWeight: 600, marginBottom: 'var(--s2)' }}>{customer?.name || 'N/A'}</p>
                  <p style={{ fontSize: 14, color: 'var(--ts)' }}>{customer?.phone || 'N/A'}</p>
                  <p style={{ fontSize: 14, color: 'var(--ts)' }}>{customer?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="sec-title">Job Details</p>
                  <p style={{ fontWeight: 600, marginBottom: 'var(--s2)' }}>{job.title}</p>
                  <p style={{ fontSize: 14, color: 'var(--ts)' }}>Type: {job.type}</p>
                  <p style={{ fontSize: 14, color: 'var(--ts)' }}>Unit: {job.unitType}</p>
                  <p style={{ fontSize: 14, color: 'var(--ts)' }}>Technician: {technician?.name || 'Unassigned'}</p>
                </div>
              </div>
            </div>

            {/* Diagnostics Preview */}
            {job.diagnostics && (
              <div className="tile" style={{ marginBottom: 'var(--s5)' }}>
                <p className="sec-title">Diagnostic Readings</p>
                <div className="g4" style={{ fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'var(--ts)', fontSize: 11 }}>Voltage</span>
                    <p style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{job.diagnostics.voltage || '--'} V</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ts)', fontSize: 11 }}>Current</span>
                    <p style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{job.diagnostics.current || '--'} A</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ts)', fontSize: 11 }}>Suction</span>
                    <p style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{job.diagnostics.suction || '--'} PSI</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ts)', fontSize: 11 }}>Discharge</span>
                    <p style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{job.diagnostics.discharge || '--'} PSI</p>
                  </div>
                </div>
              </div>
            )}

            {/* ODS Preview */}
            {(job.diagnostics?.refrigerantType || job.diagnostics?.refrigerantUsed) && (
              <div className="refrig-box" style={{ marginBottom: 'var(--s5)' }}>
                <p className="sec-title">ODS / Refrigerant Data</p>
                <div className="g3">
                  <div>
                    <span style={{ color: '#004d40', fontSize: 11 }}>Refrigerant Type</span>
                    <p style={{ fontSize: 18, fontWeight: 300, color: '#004d40' }}>
                      {job.diagnostics?.refrigerantType || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span style={{ color: '#004d40', fontSize: 11 }}>Recovered</span>
                    <p style={{ fontSize: 18, fontWeight: 300, color: '#004d40' }}>
                      {job.diagnostics?.refrigerantRecovered?.toFixed(1) || '0.0'} kg
                    </p>
                  </div>
                  <div>
                    <span style={{ color: '#004d40', fontSize: 11 }}>Used</span>
                    <p style={{ fontSize: 18, fontWeight: 300, color: '#004d40' }}>
                      {job.diagnostics?.refrigerantUsed?.toFixed(1) || '0.0'} kg
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Signatures Preview */}
            <div className="g2">
              <div className="tile" style={{ textAlign: 'center' }}>
                <p className="sec-title">Technician</p>
                <div style={{ 
                  borderBottom: '1px solid var(--tp)', 
                  paddingBottom: 'var(--s4)',
                  marginBottom: 'var(--s2)',
                  minHeight: 40
                }}>
                  {technician?.name}
                </div>
                <p style={{ fontSize: 12, color: 'var(--ts)' }}>{technician?.name || '____________________'}</p>
              </div>
              <div className="tile" style={{ textAlign: 'center' }}>
                <p className="sec-title">Customer</p>
                <div style={{ 
                  borderBottom: '1px solid var(--tp)', 
                  paddingBottom: 'var(--s4)',
                  marginBottom: 'var(--s2)',
                  minHeight: 40,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center'
                }}>
                  {job.signature ? (
                    <img src={job.signature} alt="Customer signature" style={{ maxHeight: 36, maxWidth: '100%' }} />
                  ) : null}
                </div>
                <p style={{ fontSize: 12, color: 'var(--ts)' }}>{customer?.name || '____________________'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-s" onClick={onClose}>Cancel</button>
          <button className="btn btn-p" onClick={handlePrint}>🖨️ Print Job Card</button>
        </div>
      </div>
    </div>
  );
}
