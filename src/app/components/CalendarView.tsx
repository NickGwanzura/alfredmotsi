'use client';

import React, { useState, useEffect } from 'react';
import { Job, User, Customer } from '@/app/types';
import { STATUS_CFG, TYPE_CFG, TECH_STATUS } from '@/app/lib/config';
import { Avatar } from './ui';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { canViewAllJobs } from '@/app/lib/permissions';

type ViewMode = 'day' | 'week' | 'month';

interface CalendarViewProps {
  jobs: Job[];
  techs: User[];
  customers: Customer[];
  currentUser: User;
  onJobClick: (job: Job) => void;
}

// Local-timezone date string (toISOString would shift to UTC and mark the
// wrong day as "today" between midnight and 02:00 in UTC+2)
function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function jobAssignedTo(j: Job, techId: string): boolean {
  return j.techIds.includes(techId) || (j.coTechIds ?? []).includes(techId);
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function addMonths(base: Date, n: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + n);
  return d;
}

export default function CalendarView({ jobs, techs, customers, currentUser, onJobClick }: CalendarViewProps) {
  const userRole = currentUser.role;
  const [view, setView] = useState<ViewMode>('week');
  const [offset, setOffset] = useState(0);

  // Computed per render so a tab left open overnight rolls over to the new day
  const todayBase = new Date();
  const todayStr = isoDate(todayBase);

  // Mobile: auto-switch to day view
  useEffect(() => {
    const check = () => {
      if (window.innerWidth < 768) setView('day');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fall back to currentUser so the schedule still renders if the tech list
  // failed to load (or doesn't include the current user)
  const shownTechs = canViewAllJobs(userRole)
    ? techs
    : [techs.find(t => t.id === currentUser.id) ?? currentUser];
  const visJobs = canViewAllJobs(userRole) ? jobs : jobs.filter(j => jobAssignedTo(j, currentUser.id));

  // ── Computed dates per view ────────────────────────────────────────────────
  // Day view: single date
  const dayDate = addDays(todayBase, offset);
  const dayDateStr = isoDate(dayDate);

  // Week view: 7-day grid starting on Monday (matches month view)
  const weekStart = new Date(todayBase);
  weekStart.setDate(todayBase.getDate() - ((todayBase.getDay() + 6) % 7) + offset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => isoDate(addDays(weekStart, i)));

  // Month view: grid for the month at (todayBase + offset months)
  const monthRef = addMonths(new Date(todayBase.getFullYear(), todayBase.getMonth(), 1), offset);
  const monthYear = monthRef.getFullYear();
  const monthMonth = monthRef.getMonth();
  // First day of month, then back-fill to Monday (ISO week starts Mon)
  const firstOfMonth = new Date(monthYear, monthMonth, 1);
  // getDay(): 0=Sun,1=Mon,...6=Sat → shift so Mon=0
  const startDow = (firstOfMonth.getDay() + 6) % 7; // Mon-based index
  const gridStart = addDays(firstOfMonth, -startDow);
  const daysInMonth = new Date(monthYear, monthMonth + 1, 0).getDate();
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;
  const monthGrid = Array.from({ length: totalCells }, (_, i) => addDays(gridStart, i));

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getDayTechJobs = (tid: string, d: string) =>
    visJobs.filter(j => jobAssignedTo(j, tid) && j.date === d);

  const getDayAllJobs = (d: string) =>
    visJobs.filter(j => j.date === d);

  const getMostCommonStatus = (dayJobs: Job[]): string => {
    if (!dayJobs.length) return '';
    const counts: Record<string, number> = {};
    dayJobs.forEach(j => { counts[j.status] = (counts[j.status] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  };

  // ── Navigation handlers ────────────────────────────────────────────────────
  const prev = () => setOffset(o => o - 1);
  const next = () => setOffset(o => o + 1);
  const goToday = () => setOffset(0);

  const handleViewChange = (v: ViewMode) => {
    setView(v);
    setOffset(0);
  };

  // ── Navigation label ───────────────────────────────────────────────────────
  let navLabel = '';
  if (view === 'day') {
    navLabel = dayDate.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } else if (view === 'week') {
    const wEnd = addDays(weekStart, 6);
    navLabel = `${weekStart.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} \u2013 ${wEnd.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  } else {
    navLabel = monthRef.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  }

  // Job type color dot helper
  const getJobTypeDot = (type: string): { color: string; label: string } => {
    const cfg = TYPE_CFG[type as keyof typeof TYPE_CFG];
    return cfg ? { color: cfg.color, label: cfg.label } : { color: '#888', label: type };
  };

  // ── Job card (reusable) ────────────────────────────────────────────────────
  const JobCard = ({ j }: { j: Job }) => {
    const sc = STATUS_CFG[j.status] || STATUS_CFG.scheduled;
    const typeInfo = getJobTypeDot(j.type);
    const borderColor = j.alerts && j.alerts.length ? '#ef4444' : typeInfo.color;
    return (
      <div
        className="mb-1.5 rounded-lg cursor-pointer text-xs bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-150"
        style={{ borderLeftWidth: '3px', borderLeftStyle: 'solid', borderLeftColor: borderColor }}
        onClick={() => onJobClick(j)}
      >
        <div className="px-2.5 py-1.5">
          <p className="font-semibold truncate text-gray-900 m-0">{j.time} {j.title}</p>
          <p className="truncate text-gray-500 m-0 text-[11px]">
            {customers.find(c => c.id === j.customerId)?.name?.split(' ').slice(0, 2).join(' ')}
          </p>
          {j.alerts && j.alerts.length > 0 && (
            <p className="text-red-500 m-0 text-[10px] font-medium mt-0.5">Alert</p>
          )}
        </div>
      </div>
    );
  };

  // ── Segmented control ──────────────────────────────────────────────────────
  const SegControl = () => (
    <div className="inline-flex rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
      {(['day', 'week', 'month'] as ViewMode[]).map((v, i) => (
        <button
          key={v}
          onClick={() => handleViewChange(v)}
          className={`px-4 py-1.5 text-xs font-semibold cursor-pointer border-none capitalize transition-all duration-150 ${
            view === v
              ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          } ${i !== 2 ? 'border-r border-gray-200' : ''}`}
        >
          {v}
        </button>
      ))}
    </div>
  );

  // ── DAY VIEW ──────────────────────────────────────────────────────────────
  const DayView = () => (
    <div className="space-y-4">
      {shownTechs.map(t => {
        const dayJobs = getDayTechJobs(t.id, dayDateStr);
        return (
          <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <Avatar name={t.name} size={28} />
              <div>
                <p className="text-sm font-semibold text-gray-900 m-0">{t.name}</p>
                <p className="text-xs m-0" style={{ color: TECH_STATUS[t.status || 'available']?.color || '#888' }}>
                  {TECH_STATUS[t.status || 'available']?.label}
                </p>
              </div>
              <span className="ml-auto text-xs text-gray-500 font-medium">
                {dayJobs.length} job{dayJobs.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="p-3">
              {dayJobs.length > 0
                ? dayJobs.map(j => <JobCard key={j.id} j={j} />)
                : <p className="text-sm text-gray-400 m-0 text-center py-4">No jobs scheduled for this day.</p>
              }
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── WEEK VIEW ─────────────────────────────────────────────────────────────
  const WeekView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: shownTechs.length * 200 + 160 }}>
          <thead>
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100 bg-gray-50 text-left" style={{ width: 140 }}>
                Date
              </th>
              {shownTechs.map(t => (
                <th key={t.id} className="px-4 py-3 border-b border-gray-100 text-left bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Avatar name={t.name} size={26} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 m-0">{t.name.split(' ')[0]}</p>
                      <p className="text-[11px] m-0" style={{ color: TECH_STATUS[t.status || 'available']?.color || '#888' }}>
                        {TECH_STATUS[t.status || 'available']?.label}
                      </p>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weekDays.map(d => {
              const isToday = d === todayStr;
              const dl = new Date(d + 'T12:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
              return (
                <tr key={d}>
                  <td className={`px-3 py-2 align-top border-b border-gray-100 ${isToday ? 'bg-brand-50' : 'bg-white'}`} style={{ width: 140 }}>
                    <p className={`text-sm m-0 ${isToday ? 'font-bold text-brand-600' : 'font-medium text-gray-600'}`}>
                      {dl}
                    </p>
                    {isToday && <p className="text-[10px] text-brand-600 font-semibold m-0 uppercase tracking-wider">Today</p>}
                  </td>
                  {shownTechs.map(t => {
                    const dayJobs = getDayTechJobs(t.id, d);
                    return (
                      <td key={t.id} className="border-b border-gray-100 align-top p-2">
                        {dayJobs.map(j => <JobCard key={j.id} j={j} />)}
                        {dayJobs.length === 0 && (
                          <p className="text-xs text-center pt-3 m-0 text-gray-300">\u2014</p>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── MONTH VIEW ────────────────────────────────────────────────────────────
  const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const MonthView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="border-collapse w-full" style={{ minWidth: 420 }}>
          <thead>
            <tr>
              {DOW_LABELS.map(d => (
                <th key={d} className="px-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 text-center border-b border-gray-100 bg-gray-50">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: totalCells / 7 }, (_, row) => (
              <tr key={row}>
                {monthGrid.slice(row * 7, row * 7 + 7).map(cellDate => {
                  const ds = isoDate(cellDate);
                  const inMonth = cellDate.getMonth() === monthMonth;
                  const isToday = ds === todayStr;
                  const cellJobs = getDayAllJobs(ds);
                  const mostStatus = getMostCommonStatus(cellJobs);
                  const statusColor = mostStatus ? ((STATUS_CFG as Record<string, { bg: string; txt: string; label: string }>)[mostStatus]?.bg || 'transparent') : 'transparent';
                  const hasAlert = cellJobs.some(j => j.alerts && j.alerts.length > 0);

                  return (
                    <td
                      key={ds}
                      onClick={() => { handleViewChange('day'); setOffset(Math.round((cellDate.getTime() - todayBase.getTime()) / 86400000)); }}
                      className="border-b border-r border-gray-50 align-top p-1.5 cursor-pointer transition-all duration-100 hover:bg-gray-50"
                      style={{
                        minHeight: '90px',
                        height: '90px',
                        background: inMonth ? 'white' : 'bg-gray-50/50',
                      }}
                    >
                      <div className={`flex items-center justify-between mb-1 ${inMonth ? '' : 'opacity-40'}`}>
                        <span
                          className={`inline-flex items-center justify-center text-sm font-medium ${
                            isToday
                              ? 'w-7 h-7 rounded-full bg-brand-50 text-brand-600 font-bold'
                              : 'text-gray-700'
                          } ${!inMonth ? 'text-gray-400' : ''}`}
                        >
                          {cellDate.getDate()}
                        </span>
                        {hasAlert && (
                          <span className="w-2 h-2 rounded-full shrink-0 inline-block bg-red-500" />
                        )}
                      </div>
                      {cellJobs.length > 0 && (
                        <div className="flex flex-col gap-1 mt-1">
                          {cellJobs.slice(0, 3).map(j => {
                            const typeInfo = getJobTypeDot(j.type);
                            return (
                              <div
                                key={j.id}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={(e) => { e.stopPropagation(); onJobClick(j); }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: typeInfo.color }} />
                                <span className="truncate text-gray-600">{j.title}</span>
                              </div>
                            );
                          })}
                          {cellJobs.length > 3 && (
                            <span className="text-[10px] text-gray-400 font-medium pl-2">+{cellJobs.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{canViewAllJobs(userRole) ? 'Master Calendar' : 'My Schedule'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {canViewAllJobs(userRole) ? 'Side-by-side technician grid. Conflict detection active.' : 'Your schedule view.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SegControl />
        </div>
      </div>

      {/* Navigation bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={prev}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer"
              onClick={goToday}
            >
              Today
            </button>
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={next}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">{navLabel}</h2>
        </div>
      </div>

      {view === 'day' && <DayView />}
      {view === 'week' && <WeekView />}
      {view === 'month' && <MonthView />}

      {/* Legend */}
      <div className="mt-5 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Status Legend</p>
        <div className="flex gap-4 flex-wrap">
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-2.5 h-2.5 rounded inline-block shrink-0" style={{ background: v.bg }} />
              {v.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
