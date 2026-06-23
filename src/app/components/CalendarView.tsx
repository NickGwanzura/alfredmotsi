'use client';

import React, { useState, useEffect } from 'react';
import { Job, User, Customer } from '@/app/types';
import { STATUS_CFG, TYPE_CFG, TECH_STATUS } from '@/app/lib/config';
import { Avatar } from './ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { canViewAllJobs } from '@/app/lib/permissions';

type ViewMode = 'day' | 'week' | 'month';

interface CalendarViewProps {
  jobs: Job[];
  techs: User[];
  customers: Customer[];
  currentUser: User;
  onJobClick: (job: Job) => void;
}

const todayBase = new Date();
const todayStr = todayBase.toISOString().split('T')[0];

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
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

  // Mobile: auto-switch to day view
  useEffect(() => {
    const check = () => {
      if (window.innerWidth < 768) setView('day');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const shownTechs = canViewAllJobs(userRole) ? techs : techs.filter(t => t.id === currentUser.id);
  const visJobs = canViewAllJobs(userRole) ? jobs : jobs.filter(j => j.techIds.includes(currentUser.id));

  // ── Computed dates per view ────────────────────────────────────────────────
  // Day view: single date
  const dayDate = addDays(todayBase, offset);
  const dayDateStr = isoDate(dayDate);

  // Week view: 7-day grid starting on Sunday
  const weekStart = new Date(todayBase);
  weekStart.setDate(todayBase.getDate() - todayBase.getDay() + offset * 7);
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
    visJobs.filter(j => j.techIds.includes(tid) && j.date === d);

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

  // ── Job card (reusable) ────────────────────────────────────────────────────
  const JobCard = ({ j }: { j: Job }) => {
    const sc = STATUS_CFG[j.status] || STATUS_CFG.scheduled;
    const col = TYPE_CFG[j.type]?.color || '#888';
    return (
      <div
        className="mb-1 rounded cursor-pointer text-xs"
        style={{
          background: sc.bg,
          color: sc.txt,
          borderLeftWidth: '3px',
          borderLeftStyle: 'solid',
          borderLeftColor: j.alerts && j.alerts.length ? 'var(--color-support-error)' : col,
          padding: '6px 8px',
        }}
        onClick={() => onJobClick(j)}
      >
        <p className="font-semibold truncate m-0">{j.time} {j.title}</p>
        <p className="truncate m-0" style={{ opacity: 0.75 }}>
          {customers.find(c => c.id === j.customerId)?.name?.split(' ').slice(0, 2).join(' ')}
        </p>
        {j.alerts && j.alerts.length > 0 && (
          <p className="text-support-error m-0" style={{ marginTop: '2px' }}>⚡ Alert</p>
        )}
      </div>
    );
  };

  // ── Segmented control ──────────────────────────────────────────────────────
  const SegControl = () => (
    <div className="inline-flex rounded overflow-hidden" style={{ border: '1px solid var(--color-border-subtle)' }}>
      {(['day', 'week', 'month'] as ViewMode[]).map(v => (
        <button
          key={v}
          onClick={() => handleViewChange(v)}
          className="px-3.5 py-1.5 text-xs font-semibold cursor-pointer border-none capitalize transition-[background,color] duration-150"
          style={{
            borderRight: v !== 'month' ? '1px solid var(--color-border-subtle)' : 'none',
            background: view === v ? 'var(--color-interactive)' : 'var(--color-surface-hover)',
            color: view === v ? '#fff' : 'var(--color-text-secondary)',
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );

  // ── DAY VIEW ──────────────────────────────────────────────────────────────
  const DayView = () => (
    <div className="flex flex-col gap-4">
      {shownTechs.map(t => {
        const dayJobs = getDayTechJobs(t.id, dayDateStr);
        return (
          <div key={t.id} className="bg-layer rounded-md overflow-hidden">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border-subtle" style={{ background: 'var(--color-surface-hover)' }}>
              <Avatar name={t.name} size={28} />
              <div>
                <p className="text-sm font-semibold text-text-primary m-0">{t.name}</p>
                <p className="text-xs m-0" style={{ color: TECH_STATUS[t.status || 'available']?.color || '#888' }}>
                  {TECH_STATUS[t.status || 'available']?.label}
                </p>
              </div>
              <span className="ml-auto text-xs text-text-secondary">
                {dayJobs.length} job{dayJobs.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="px-3 py-2.5">
              {dayJobs.length > 0
                ? dayJobs.map(j => <JobCard key={j.id} j={j} />)
                : <p className="text-sm text-text-secondary m-0 opacity-50">\u2014</p>
              }
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── WEEK VIEW ─────────────────────────────────────────────────────────────
  const WeekView = () => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth: shownTechs.length * 180 + 160 }}>
        <thead>
          <tr>
            <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider border border-border-subtle bg-surface-hover" style={{ width: 140 }}>
              Date
            </th>
            {shownTechs.map(t => (
              <th key={t.id} className="px-4 py-3 border border-border-subtle text-left bg-surface-hover">
                <div className="flex items-center gap-2">
                  <Avatar name={t.name} size={28} />
                  <div>
                    <p className="text-sm font-semibold text-text-primary m-0">{t.name.split(' ')[0]}</p>
                    <p className="text-xs m-0" style={{ color: TECH_STATUS[t.status || 'available']?.color || '#888' }}>
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
                <td className="px-3 py-2 border border-border-subtle align-top" style={{ width: 140, background: isToday ? 'rgba(69,137,255,.06)' : 'var(--color-surface)' }}>
                  <p className="text-sm m-0" style={{ fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--color-interactive)' : 'var(--color-text-secondary)' }}>
                    {dl}
                  </p>
                  {isToday && <p className="text-[11px] text-interactive font-semibold m-0">TODAY</p>}
                </td>
                {shownTechs.map(t => {
                  const dayJobs = getDayTechJobs(t.id, d);
                  return (
                    <td
                      key={t.id}
                      className="border border-border-subtle align-top p-2"
                    >
                      {dayJobs.map(j => <JobCard key={j.id} j={j} />)}
                      {dayJobs.length === 0 && (
                        <p className="text-xs text-center pt-4 m-0" style={{ color: 'var(--color-border-subtle)' }}>
                          \u2014
                        </p>
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
  );

  // ── MONTH VIEW ────────────────────────────────────────────────────────────
  const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const MonthView = () => (
    <div className="overflow-x-auto">
      <table className="border-collapse w-full" style={{ minWidth: 420 }}>
        <thead>
          <tr>
            {DOW_LABELS.map(d => (
              <th key={d} className="px-1 py-2 text-[11px] font-semibold text-text-secondary uppercase tracking-wider text-center border border-border-subtle bg-surface-hover">
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
                    className="border border-border-subtle align-top p-1.5 cursor-pointer transition-[background] duration-100"
                    style={{
                      minHeight: '80px',
                      height: '80px',
                      background: isToday ? 'rgba(69,137,255,.06)' : inMonth ? 'var(--color-surface)' : 'var(--color-layer)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="inline-flex items-center justify-center text-sm"
                        style={{
                          fontWeight: isToday ? 700 : 400,
                          color: isToday ? '#fff' : inMonth ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                          opacity: inMonth ? 1 : 0.4,
                          width: isToday ? 22 : 'auto',
                          height: isToday ? 22 : 'auto',
                          borderRadius: isToday ? '50%' : 0,
                          background: isToday ? 'var(--color-interactive)' : 'transparent',
                        }}
                      >
                        {cellDate.getDate()}
                      </span>
                      {hasAlert && (
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 inline-block" style={{ background: 'var(--color-support-error)' }} />
                      )}
                    </div>
                    {cellJobs.length > 0 && (
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-primary">
                          <span className="w-2 h-2 rounded-sm shrink-0 inline-block" style={{ background: statusColor }} />
                          {cellJobs.length} job{cellJobs.length !== 1 ? 's' : ''}
                        </span>
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
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold m-0">{canViewAllJobs(userRole) ? 'Master Calendar' : 'My Schedule'}</h1>
          <p className="m-0 text-sm text-text-secondary">
            {canViewAllJobs(userRole) ? 'Side-by-side technician grid. Conflict detection active.' : 'Your schedule view.'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <SegControl />
          <div className="flex items-center gap-0">
            <button
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text-secondary bg-layer border border-border-subtle cursor-pointer hover:bg-layer-hover transition-colors rounded-l"
              onClick={prev}
            >
              <ChevronLeft size={16} />
              Prev
            </button>
            <button className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text-secondary bg-layer border-t border-b border-border-subtle cursor-pointer hover:bg-layer-hover transition-colors" onClick={goToday}>Today</button>
            <button
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text-secondary bg-layer border border-border-subtle cursor-pointer hover:bg-layer-hover transition-colors rounded-r"
              onClick={next}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
          <span className="text-sm font-medium text-text-primary text-right">{navLabel}</span>
        </div>
      </div>

      {view === 'day' && <DayView />}
      {view === 'week' && <WeekView />}
      {view === 'month' && <MonthView />}

      <div className="mt-4 flex gap-4 flex-wrap">
        {Object.entries(STATUS_CFG).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: v.bg }} />
            {v.label}
          </div>
        ))}
      </div>
    </div>
  );
}
