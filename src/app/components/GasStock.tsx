'use client';

import React from 'react';
import { GasStockItem } from '@/app/types';
import { SectionTitle } from './ui';

interface GasStockProps {
  stock: GasStockItem[];
  onAdd?: (item: GasStockItem) => void;
}

const LOW_STOCK_THRESHOLD = 20; // percentage

function calculateTotalCylinders(stock: GasStockItem[]): number {
  return stock.length;
}

function calculateTotalKg(stock: GasStockItem[]): number {
  return stock.reduce((total, item) => total + item.remaining, 0);
}

function calculateLowStockCount(stock: GasStockItem[]): number {
  return stock.filter(item => getRemainingPercentage(item) < LOW_STOCK_THRESHOLD).length;
}

function getRemainingPercentage(item: GasStockItem): number {
  if (item.quantity === 0) return 0;
  return Math.round((item.remaining / item.quantity) * 100);
}

function isLowStock(item: GasStockItem): boolean {
  return getRemainingPercentage(item) < LOW_STOCK_THRESHOLD;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}

export default function GasStock({ stock, onAdd }: GasStockProps) {
  const totalCylinders = calculateTotalCylinders(stock);
  const totalKg = calculateTotalKg(stock);
  const lowStockCount = calculateLowStockCount(stock);

  const stats = [
    { label: 'Total Cylinders', v: totalCylinders },
    { label: 'Total kg', v: totalKg.toFixed(1) },
    { label: 'Low Stock Alerts', v: lowStockCount, alert: lowStockCount > 0 },
  ];

  return (
    <div className="fi-anim">
      <div className="page-hdr">
        <h1>Refrigerant Stock</h1>
        <p>Manage refrigerant gas inventory and track usage</p>
      </div>

      <div className="g3" style={{ marginBottom: 'var(--s6)' }}>
        {stats.map((s, i) => (
          <div 
            key={i} 
            className="tile" 
            style={{ 
              borderTop: `3px solid ${s.alert ? 'var(--se)' : 'var(--bi)'}`,
            }}
          >
            <div 
              className="stat-v" 
              style={{ color: s.alert ? 'var(--se)' : undefined }}
            >
              {s.v}
            </div>
            <div className="stat-l">{s.label}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
          <SectionTitle>Stock Inventory</SectionTitle>
          {onAdd && (
            <button 
              className="btn btn-primary"
              onClick={() => {
                // Open add modal or navigate to add form
                const emptyItem: GasStockItem = {
                  id: '',
                  gasType: '',
                  brand: '',
                  quantity: 0,
                  remaining: 0,
                  unit: 'kg',
                  supplier: '',
                  supplierRef: '',
                  addedBy: '',
                  date: new Date().toISOString().split('T')[0],
                  notes: '',
                };
                onAdd(emptyItem);
              }}
            >
              + Add Stock
            </button>
          )}
        </div>

        {stock.length === 0 ? (
          <div className="tile">
            <p style={{ color: 'var(--ts)', fontSize: '14px', textAlign: 'center', padding: 'var(--s6)' }}>
              No refrigerant stock records found.
            </p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Gas Type</th>
                  <th>Brand</th>
                  <th>Quantity (kg)</th>
                  <th>Remaining</th>
                  <th>Supplier</th>
                  <th>Added By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((item) => {
                  const percentage = getRemainingPercentage(item);
                  const lowStock = isLowStock(item);

                  return (
                    <tr 
                      key={item.id}
                      style={lowStock ? { backgroundColor: 'rgba(218, 30, 40, 0.05)' } : undefined}
                    >
                      <td>
                        <span style={{ fontWeight: 600 }}>{item.gasType}</span>
                      </td>
                      <td>{item.brand}</td>
                      <td>{item.quantity} {item.unit}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
                          <span 
                            style={{ 
                              fontWeight: 600, 
                              color: lowStock ? 'var(--se)' : 'inherit',
                              minWidth: '45px'
                            }}
                          >
                            {item.remaining} {item.unit}
                          </span>
                          <div 
                            style={{ 
                              flex: 1, 
                              minWidth: '60px',
                              height: '8px', 
                              backgroundColor: 'var(--tgr)', 
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}
                          >
                            <div 
                              style={{
                                width: `${percentage}%`,
                                height: '100%',
                                backgroundColor: lowStock ? 'var(--se)' : 'var(--ss)',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                          <span 
                            style={{ 
                              fontSize: '12px', 
                              color: lowStock ? 'var(--se)' : 'var(--ts)',
                              minWidth: '35px'
                            }}
                          >
                            {percentage}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <div>{item.supplier}</div>
                        {item.supplierRef && (
                          <div style={{ fontSize: '12px', color: 'var(--ts)' }}>
                            Ref: {item.supplierRef}
                          </div>
                        )}
                      </td>
                      <td>
                        <div>{item.addedBy}</div>
                        <div style={{ fontSize: '12px', color: 'var(--ts)' }}>
                          {formatDate(item.date)}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
                          <button 
                            className="btn btn-sm"
                            style={{ fontSize: '12px', padding: 'var(--s1) var(--s3)' }}
                            onClick={() => {
                              // Edit action
                              console.log('Edit item:', item.id);
                            }}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-sm"
                            style={{ 
                              fontSize: '12px', 
                              padding: 'var(--s1) var(--s3)',
                              opacity: 0.7
                            }}
                            onClick={() => {
                              // View usage history
                              console.log('View usage:', item.id);
                            }}
                          >
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {lowStockCount > 0 && (
          <div 
            className="notif notif-w" 
            style={{ marginTop: 'var(--s4)' }}
          >
            <div>
              <div className="notif-title">Low Stock Alert</div>
              <div className="notif-body">
                {lowStockCount} item{lowStockCount !== 1 ? 's' : ''} below {LOW_STOCK_THRESHOLD}% remaining. 
                Consider restocking soon.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
