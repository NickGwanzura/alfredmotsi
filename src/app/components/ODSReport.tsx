'use client';

import React, { useState, useMemo } from 'react';
import { Job, Customer, RefrigerantType } from '@/app/types';
import { SectionTitle } from './ui';

interface ODSReportProps {
  jobs: Job[];
  customers: Customer[];
  onExport?: () => void;
}

const REFRIGERANT_TYPES: RefrigerantType[] = [
  'R-32',
  'R-410A',
  'R-22',
  'R-134a',
  'R-407C',
  'R-600A',
  'R-290',
];

// Helper function to filter jobs with refrigerant data
function getJobsWithRefrigerantData(jobs: Job[]): Job[] {
  return jobs.filter(
    (job) =>
      job.diagnostics &&
      (job.diagnostics.refrigerantRecovered !== undefined ||
        job.diagnostics.refrigerantUsed !== undefined ||
        job.diagnostics.refrigerantReused !== undefined)
  );
}

// Helper function to calculate total recovered
function getTotalRecovered(jobs: Job[]): number {
  return jobs.reduce((total, job) => {
    const recovered = job.diagnostics?.refrigerantRecovered || 0;
    return total + recovered;
  }, 0);
}

// Helper function to calculate total used
function getTotalUsed(jobs: Job[]): number {
  return jobs.reduce((total, job) => {
    const used = job.diagnostics?.refrigerantUsed || 0;
    return total + used;
  }, 0);
}

// Helper function to calculate total reused
function getTotalReused(jobs: Job[]): number {
  return jobs.reduce((total, job) => {
    const reused = job.diagnostics?.refrigerantReused || 0;
    return total + reused;
  }, 0);
}

// Helper function to count R-22 jobs
function getR22JobCount(jobs: Job[]): number {
  return jobs.filter(
    (job) =>
      job.diagnostics?.refrigerantType === 'R-22' &&
      (job.diagnostics?.refrigerantRecovered || 0) > 0
  ).length;
}

// Helper function to count retrofits (jobs with recovered and different refrigerant used)
function getRetrofitCount(jobs: Job[]): number {
  return jobs.filter(
    (job) =>
      job.diagnostics &&
      (job.diagnostics.refrigerantRecovered || 0) > 0 &&
      (job.diagnostics.refrigerantUsed || 0) > 0 &&
      job.diagnostics.refrigerantType !== job.diagnostics.refrigerantType
  ).length;
}

// Helper function to get customer name
function getCustomerName(customerId: string, customers: Customer[]): string {
  const customer = customers.find((c) => c.id === customerId);
  return customer?.name || 'Unknown';
}

// Helper function to format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Helper function to get job status style
function getStatusStyle(status: string): React.CSSProperties {
  const styles: Record<string, React.CSSProperties> = {
    completed: { background: '#d4edda', color: '#155724' },
    'in-progress': { background: '#fff3cd', color: '#664d03' },
    scheduled: { background: '#d1ecf1', color: '#0c5460' },
    cancelled: { background: '#f8d7da', color: '#842029' },
  };
  return styles[status] || { background: '#e0e0e0', color: '#161616' };
}

export default function ODSReport({
  jobs,
  customers,
  onExport,
}: ODSReportProps) {
  const [selectedRefrigerant, setSelectedRefrigerant] = useState<string>('all');

  // Get jobs with refrigerant data
  const odsJobs = useMemo(() => getJobsWithRefrigerantData(jobs), [jobs]);

  // Filter jobs by refrigerant type
  const filteredJobs = useMemo(() => {
    if (selectedRefrigerant === 'all') return odsJobs;
    return odsJobs.filter(
      (job) => job.diagnostics?.refrigerantType === selectedRefrigerant
    );
  }, [odsJobs, selectedRefrigerant]);

  // Calculate stats
  const totalRecovered = useMemo(() => getTotalRecovered(filteredJobs), [filteredJobs]);
  const totalUsed = useMemo(() => getTotalUsed(filteredJobs), [filteredJobs]);
  const totalReused = useMemo(() => getTotalReused(filteredJobs), [filteredJobs]);
  const r22Count = useMemo(() => getR22JobCount(odsJobs), [odsJobs]);
  const retrofitCount = useMemo(() => getRetrofitCount(odsJobs), [odsJobs]);

  return (
    <div className="fi-anim">
      {/* ODS Banner */}
      <div className="ods-banner">
        <div className="page-hdr" style={{ marginBottom: 0 }}>
          <h1 style={{ color: '#fff' }}>ODS Compliance Report</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: '8px' }}>
            Track refrigerant recovery, usage, and compliance with ozone depleting substances regulations
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="g4" style={{ marginBottom: '24px' }}>
        <div className="ods-stat">
          <div className="ods-stat-v">{totalRecovered.toFixed(2)}</div>
          <div className="ods-stat-l">Total Recovery (kg)</div>
        </div>
        <div className="ods-stat">
          <div className="ods-stat-v">{totalUsed.toFixed(2)}</div>
          <div className="ods-stat-l">Total Used (kg)</div>
        </div>
        <div className="ods-stat">
          <div className="ods-stat-v">{r22Count}</div>
          <div className="ods-stat-l">R-22 Recovered</div>
        </div>
        <div className="ods-stat">
          <div className="ods-stat-v">{retrofitCount}</div>
          <div className="ods-stat-l">Retrofits Completed</div>
        </div>
      </div>

      {/* Filters and Export */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '200px', maxWidth: '300px' }}>
          <SectionTitle color="#004d40">Filter by Refrigerant</SectionTitle>
          <select
            className="sel"
            value={selectedRefrigerant}
            onChange={(e) => setSelectedRefrigerant(e.target.value)}
            style={{ marginBottom: 0 }}
          >
            <option value="all">All Refrigerants</option>
            {REFRIGERANT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {onExport && (
          <button
            className="btn btn-ozone btn-sm"
            onClick={onExport}
            style={{ marginLeft: 'auto' }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              style={{ marginRight: '8px' }}
            >
              <path d="M8.5 2.5a.5.5 0 0 0-1 0v5.793L5.354 6.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 8.293V2.5z" />
              <path d="M3.5 9.5a.5.5 0 0 1 .5.5v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2a.5.5 0 0 1 1 0v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a.5.5 0 0 1 .5-.5z" />
            </svg>
            Export Report
          </button>
        )}
      </div>

      {/* Refrigerant Summary Section */}
      <div className="refrig-box">
        <SectionTitle>Refrigerant Summary</SectionTitle>
        <div className="g3">
          <div>
            <div
              className="stat-v"
              style={{ fontSize: '28px', color: '#00695c' }}
            >
              {filteredJobs.length}
            </div>
            <div className="stat-l">Total Jobs</div>
          </div>
          <div>
            <div
              className="stat-v"
              style={{ fontSize: '28px', color: '#00695c' }}
            >
              {totalReused.toFixed(2)}
            </div>
            <div className="stat-l">Total Reused (kg)</div>
          </div>
          <div>
            <div
              className="stat-v"
              style={{ fontSize: '28px', color: '#00695c' }}
            >
              {totalRecovered > 0
                ? ((totalReused / totalRecovered) * 100).toFixed(1)
                : '0.0'}
              %
            </div>
            <div className="stat-l">Recovery Rate</div>
          </div>
        </div>
      </div>

      {/* ODS Jobs Table */}
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Job ID</th>
              <th>Customer</th>
              <th>Refrigerant</th>
              <th>Recovered (kg)</th>
              <th>Used (kg)</th>
              <th>Reused (kg)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: 'center', padding: '40px 16px' }}
                >
                  <p style={{ color: 'var(--ts)' }}>
                    No ODS records found for the selected filter.
                  </p>
                </td>
              </tr>
            ) : (
              filteredJobs.map((job) => (
                <tr key={job.id}>
                  <td>{formatDate(job.date)}</td>
                  <td>
                    <span className="mono">{job.jobCardRef || job.id}</span>
                  </td>
                  <td>{getCustomerName(job.customerId, customers)}</td>
                  <td>
                    <span
                      className="tag"
                      style={{
                        background: '#e0f2f1',
                        color: '#00695c',
                      }}
                    >
                      {job.diagnostics?.refrigerantType || 'N/A'}
                    </span>
                  </td>
                  <td className="mono">
                    {(job.diagnostics?.refrigerantRecovered || 0).toFixed(2)}
                  </td>
                  <td className="mono">
                    {(job.diagnostics?.refrigerantUsed || 0).toFixed(2)}
                  </td>
                  <td className="mono">
                    {(job.diagnostics?.refrigerantReused || 0).toFixed(2)}
                  </td>
                  <td>
                    <span
                      className="tag"
                      style={getStatusStyle(job.status)}
                    >
                      {job.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          background: '#f0f0f0',
          border: '1px solid var(--bs1)',
        }}
      >
        <p
          style={{
            fontSize: '12px',
            color: 'var(--ts)',
            margin: 0,
          }}
        >
          <strong>Note:</strong> ODS (Ozone Depleting Substances) compliance
          requires proper documentation of all refrigerant handling. This report
          includes all jobs with refrigerant recovery, usage, or reuse data.
          R-22 is a HCFC refrigerant being phased out under the Montreal
          Protocol.
        </p>
      </div>
    </div>
  );
}
