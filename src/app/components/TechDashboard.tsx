'use client';

import React, { useState, useEffect } from 'react';
import { Job, User, Customer, FundAllocation } from '@/app/types';
import { TYPE_CFG, STATUS_CFG } from '@/app/lib/config';
import { StatusTag, Avatar, ContextBanner } from './ui';
import { ClipboardList, MapPin, Clock, CalendarDays, CheckCircle, ArrowRight, Wrench, AlertTriangle, DollarSign, Beaker } from 'lucide-react';

interface TechDashboardProps {
  jobs: Job[];
  techs: User[];
  customers: Customer[];
  currentUser: User;
  onJobClick: (job: Job) => void;
}

const today = new Date();
const todayStr = today.toISOString().split('T')[0];

export default function TechDashboard({ jobs, techs, customers, currentUser, onJobClick }: TechDashboardProps) {
  const [funds, setFunds] = useState<FundAllocation[]>([]);
  const [fundsLoading, setFundsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/funds')
      .then(r => r.ok ? r.json() : [])
      .then(data => setFunds(data.filter((f: FundAllocation) => f.techId === currentUser.id)))
      .catch(() => {})
      .finally(() => setFundsLoading(false));
  }, [currentUser.id]);

  const myJobs = jobs.filter(j => j.techIds.includes(currentUser.id));
  const todayJobs = myJobs.filter(j => j.date === todayStr);
  const activeJobs = myJobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled');
  const completedJobs = myJobs.filter(j => j.status === 'completed');
  const onSiteCount = myJobs.filter(j => j.status === 'on-site').length;

  const sortedUpcoming = [...activeJobs].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const nextJob = sortedUpcoming[0];

  const totalAllocated = funds.reduce((s, f) => s + f.amount, 0);
  const totalSpent = funds.reduce((s, f) => s + f.spent, 0);
  const balance = totalAllocated - totalSpent;

  const stats = [
    { label: 'Today\'s Jobs', value: todayJobs.length, icon: CalendarDays, color: 'from-blue-500 to-blue-600' },
    { label: 'Active Assignments', value: activeJobs.length, icon: ClipboardList, color: 'from-amber-500 to-amber-600' },
    { label: 'On Site', value: onSiteCount, icon: MapPin, color: 'from-purple-500 to-purple-600' },
    { label: 'Completed', value: completedJobs.length, icon: CheckCircle, color: 'from-emerald-500 to-emerald-600' },
  ];

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <Avatar name={currentUser.name} size={44} color="#093a68" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome, {currentUser.name.split(' ')[0]}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {today.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {currentUser.specialty && <span className="ml-2 text-gray-400">· {currentUser.specialty}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Context Banner */}
      <ContextBanner title="Your Day at a Glance" icon={<ClipboardList size={18} />}>
        <p>Your <strong>Next Job</strong> is shown at the top. Click <strong>Open Job Card</strong> to clock in, record diagnostics, log gas usage, and capture signatures.</p>
        <p className="mt-1">Use the sidebar to view <strong>Jobs</strong>, <strong>Customers</strong>, <strong>Gas Stock</strong>, and log <strong>Gas Usage</strong>. Tap any job below to open it.</p>
      </ContextBanner>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-8">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">{s.label}</span>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${s.color} text-white shadow-sm`}><s.icon size={18} /></div>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main column — today's jobs */}
        <div className="md:col-span-2 space-y-6">
          {/* Next Up Card */}
          {nextJob && (
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">Next Job</p>
                  <h2 className="text-xl font-bold">{nextJob.title}</h2>
                </div>
                {nextJob.jobCardRef && (
                  <span className="text-xs font-mono bg-white/20 px-2.5 py-1 rounded-lg">{nextJob.jobCardRef}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-white/70 font-semibold uppercase tracking-wider">Customer</p>
                  <p className="font-medium">{customers.find(c => c.id === nextJob.customerId)?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-white/70 font-semibold uppercase tracking-wider">Time</p>
                  <p className="font-medium">{nextJob.date} at {nextJob.time}</p>
                </div>
                <div>
                  <p className="text-xs text-white/70 font-semibold uppercase tracking-wider">Priority</p>
                  <p className="font-medium">{nextJob.priority.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-xs text-white/70 font-semibold uppercase tracking-wider">Unit Type</p>
                  <p className="font-medium">{nextJob.unitType}</p>
                </div>
              </div>
              <button onClick={() => onJobClick(nextJob)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-brand-700 rounded-lg hover:bg-brand-50 transition-all cursor-pointer border-none">
                Open Job Card <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Today's Job List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-brand-50 text-brand-600"><CalendarDays size={16} /></div>
                <h3 className="font-semibold text-gray-900">Today&apos;s Schedule</h3>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">{todayJobs.length}</span>
              </div>
            </div>
            {todayJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <CalendarDays size={40} className="mb-3 opacity-30" />
                <p className="text-sm">No jobs scheduled for today.</p>
                <p className="text-xs text-gray-400 mt-1">Check the Calendar for upcoming assignments.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayJobs.map(j => {
                  const cust = customers.find(c => c.id === j.customerId);
                  const typeColor = TYPE_CFG[j.type]?.color || '#888';
                  const sc = STATUS_CFG[j.status];
                  const hasAlerts = j.alerts && j.alerts.length > 0;
                  return (
                    <div key={j.id} className="group flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm cursor-pointer transition-all duration-200"
                      onClick={() => onJobClick(j)}>
                      {hasAlerts ? (
                        <div className="p-1 rounded-full bg-red-100 text-red-600 shrink-0 mt-0.5"><AlertTriangle size={14} /></div>
                      ) : (
                        <div className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ background: typeColor }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm text-gray-900 truncate">{j.title}</p>
                          <StatusTag status={j.status} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {cust?.name} · <span className="font-medium">{j.time}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400">
                          <span>{j.type.charAt(0).toUpperCase() + j.type.slice(1)}</span>
                          <span>·</span>
                          <span>{j.unitType}</span>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); onJobClick(j); }}
                        className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-all border-none cursor-pointer shrink-0">
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">My Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Assigned Jobs</span>
                <span className="font-bold text-gray-900">{activeJobs.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Completed</span>
                <span className="font-bold text-emerald-600">{completedJobs.length}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">On Site Now</span>
                <span className="font-bold text-amber-600">{onSiteCount}</span>
              </div>
            </div>
          </div>

          {/* Fund Balance Card */}
          {!fundsLoading && totalAllocated > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">My Fund Balance</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Allocated</span>
                  <span className="font-semibold text-gray-900">${totalAllocated.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Spent</span>
                  <span className="font-semibold text-red-600">${totalSpent.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">Remaining</span>
                  <span className={`font-bold text-lg ${balance <= 0 ? 'text-red-600' : balance < 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    ${balance.toFixed(2)}
                  </span>
                </div>
              </div>
              {funds.filter(f => f.status === 'active').length > 0 && (
                <a href="#" onClick={(e) => { e.preventDefault(); const btn = document.querySelector('[data-page="funds"]'); if (btn) (btn as HTMLElement).click(); }}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
                  <DollarSign size={13} /> View Funds
                </a>
              )}
            </div>
          )}

          {/* Upcoming */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Upcoming</h3>
            {sortedUpcoming.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No upcoming jobs.</p>
            ) : (
              <div className="space-y-2">
                {sortedUpcoming.slice(0, 5).map(j => {
                  const cust = customers.find(c => c.id === j.customerId);
                  const isToday = j.date === todayStr;
                  return (
                    <div key={j.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => onJobClick(j)}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isToday ? 'bg-brand-600' : 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{j.title}</p>
                        <p className="text-[10px] text-gray-500">{j.date} {j.time} · {cust?.name || 'N/A'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button onClick={() => {
                const calBtn = document.querySelector('[data-page="calendar"]');
                if (calBtn) (calBtn as HTMLElement).click();
              }}
                className="w-full inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all cursor-pointer">
                <CalendarDays size={15} /> View My Calendar
              </button>
              <button onClick={() => {
                const usageBtn = document.querySelector('[data-page="gas-usage"]');
                if (usageBtn) (usageBtn as HTMLElement).click();
              }}
                className="w-full inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all cursor-pointer">
                <Beaker size={15} /> Record Gas Usage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
