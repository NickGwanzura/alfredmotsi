'use client';

import React, { useState, useMemo } from 'react';
import { Customer, Job } from '@/app/types';
import { TYPE_CFG } from '@/app/lib/config';
import { buildWA, buildMail, portalInviteText, fmtDate } from '@/app/lib/utils';
import { StatusTag, SectionTitle } from './ui';

interface CustomerDBProps {
  customers: Customer[];
  jobs: Job[];
  onJobClick: (job: Job) => void;
  onEditCustomer?: (customer: Customer) => void;
  onAddCustomer?: (customer: Customer) => void;
}

export default function CustomerDB({
  customers,
  jobs,
  onJobClick,
  onEditCustomer,
  onAddCustomer,
}: CustomerDBProps) {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.address.toLowerCase().includes(s) ||
        c.phone.includes(s) ||
        c.email.toLowerCase().includes(s)
    );
  }, [customers, search]);

  const getCustomerJobs = (customerId: string): Job[] => {
    return jobs
      .filter((j) => j.customerId === customerId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getJobCount = (customerId: string): number => {
    return jobs.filter((j) => j.customerId === customerId).length;
  };

  const handleWAClick = (customer: Customer) => {
    const phone = customer.whatsapp || customer.phone;
    const msg = `Hi ${customer.name},`;
    window.open(buildWA(phone, msg), '_blank');
  };

  const handleMailClick = (customer: Customer) => {
    const subject = 'Splash Air - Service Update';
    const body = `Dear ${customer.name},\n\n`;
    window.open(buildMail(customer.email, subject, body), '_blank');
  };

  const handlePortalInvite = (customer: Customer) => {
    const phone = customer.whatsapp || customer.phone;
    const text = portalInviteText(customer);
    window.open(buildWA(phone, text), '_blank');
  };

  const displayCustomer = selectedCustomer || filteredCustomers[0];

  return (
    <div className="fi-anim">
      <div className="page-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Customer Database</h1>
        {onAddCustomer && (
          <button 
            className="btn btn-p"
            onClick={() => {
              // Open add customer modal with empty customer
              const emptyCustomer: Customer = {
                id: '',
                name: '',
                address: '',
                siteAddress: '',
                phone: '',
                whatsapp: '',
                email: '',
                portalCode: '',
                portalEnabled: false,
              };
              onAddCustomer(emptyCustomer);
            }}
          >
            + Add Customer
          </button>
        )}
      </div>

      <div className="g2" style={{ gridTemplateColumns: '1fr 2fr', gap: 'var(--sp)' }}>
        {/* Customer List */}
        <div>
          <input
            type="text"
            className="inp"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 'var(--sp)' }}
          />

          <div className="sl">
            <div className="sl-head">
              <div className="sl-row">
                <div className="sl-col">Customer</div>
                <div className="sl-col sl-sm">Jobs</div>
              </div>
            </div>
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className={`sl-row tile-click ${
                  displayCustomer?.id === customer.id ? 'active' : ''
                }`}
                onClick={() => setSelectedCustomer(customer)}
                style={{
                  cursor: 'pointer',
                  background:
                    displayCustomer?.id === customer.id
                      ? 'var(--bga)'
                      : undefined,
                }}
              >
                <div className="sl-col">
                  <div style={{ fontWeight: 500 }}>{customer.name}</div>
                  <div className="sl-sm" style={{ color: 'var(--tt)' }}>
                    {customer.address}
                  </div>
                </div>
                <div className="sl-col sl-sm">{getJobCount(customer.id)}</div>
              </div>
            ))}
            {filteredCustomers.length === 0 && (
              <div className="sl-row" style={{ color: 'var(--tt)' }}>
                <div className="sl-col">No customers found</div>
              </div>
            )}
          </div>
        </div>

        {/* Customer Detail */}
        {displayCustomer ? (
          <div className="tile" style={{ height: 'fit-content' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 'var(--sp)',
              }}
            >
              <div>
                <h3 style={{ margin: 0, marginBottom: '4px' }}>
                  {displayCustomer.name}
                </h3>
                <div style={{ color: 'var(--tt)', fontSize: '0.9em' }}>
                  {displayCustomer.address}
                </div>
                {displayCustomer.siteAddress && (
                  <div
                    style={{
                      color: 'var(--tt)',
                      fontSize: '0.85em',
                      marginTop: '4px',
                    }}
                  >
                    Site: {displayCustomer.siteAddress}
                  </div>
                )}
              </div>
              {onEditCustomer && (
                <button
                  className="btn btn-s btn-sm"
                  onClick={() => onEditCustomer(displayCustomer)}
                >
                  Edit
                </button>
              )}
            </div>

            <div
              className="g2"
              style={{
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--sp)',
                marginBottom: 'var(--sp)',
              }}
            >
              <div>
                <SectionTitle>Contact</SectionTitle>
                <div style={{ fontSize: '0.9em' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ color: 'var(--tt)' }}>Phone: </span>
                    {displayCustomer.phone}
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ color: 'var(--tt)' }}>Email: </span>
                    {displayCustomer.email}
                  </div>
                </div>
              </div>
              <div>
                <SectionTitle>Portal Access</SectionTitle>
                <div style={{ fontSize: '0.9em' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ color: 'var(--tt)' }}>Code: </span>
                    <span className="mono">{displayCustomer.portalCode}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--tt)' }}>Status: </span>
                    {displayCustomer.portalEnabled ? (
                      <span style={{ color: 'var(--ss)' }}>Enabled</span>
                    ) : (
                      <span style={{ color: 'var(--se)' }}>Disabled</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: 'var(--sp)',
              }}
            >
              <button
                className="btn btn-wa"
                onClick={() => handleWAClick(displayCustomer)}
              >
                WhatsApp
              </button>
              <button
                className="btn btn-mail"
                onClick={() => handleMailClick(displayCustomer)}
              >
                Email
              </button>
              <button
                className="btn btn-s"
                onClick={() => handlePortalInvite(displayCustomer)}
              >
                Portal Invite
              </button>
            </div>

            <SectionTitle>Service History</SectionTitle>
            <div className="sl">
              {getCustomerJobs(displayCustomer.id).map((job) => (
                <div
                  key={job.id}
                  className="sl-row tile-click"
                  onClick={() => onJobClick(job)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="sl-col">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px',
                      }}
                    >
                      <span
                        style={{
                          color: TYPE_CFG[job.type]?.color || 'var(--tt)',
                        }}
                      >
                        {TYPE_CFG[job.type]?.icon || '•'}
                      </span>
                      <span style={{ fontWeight: 500 }}>{job.title}</span>
                    </div>
                    <div
                      className="sl-sm"
                      style={{ color: 'var(--tt)', marginLeft: '24px' }}
                    >
                      {fmtDate(job.date)} at {job.time} • {job.unitType}
                    </div>
                  </div>
                  <div className="sl-col sl-sm">
                    <StatusTag status={job.status} />
                  </div>
                </div>
              ))}
              {getCustomerJobs(displayCustomer.id).length === 0 && (
                <div className="sl-row" style={{ color: 'var(--tt)' }}>
                  <div className="sl-col">No jobs found for this customer</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            className="tile"
            style={{
              height: 'fit-content',
              color: 'var(--tt)',
              textAlign: 'center',
              padding: '48px',
            }}
          >
            Select a customer to view details
          </div>
        )}
      </div>
    </div>
  );
}
