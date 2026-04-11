'use client';

import React, { useState, useEffect } from 'react';
import { Job, User, Customer } from '@/app/types';
import { STATUS_CFG, TYPE_CFG, TECH_STATUS } from '@/app/lib/config';
import { Avatar } from './ui';
import { ChevronLeft, ChevronRight } from '@carbon/icons-react';

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
  const isAdmin = currentUser.role === 'admin';
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

  const shownTechs = isAdmin ? techs : techs.filter(t => t.id === currentUser.id);
  const visJobs = isAdmin ? jobs : jobs.filter(j => j.techIds.includes(currentUser.id));

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
    navLabel = `${weekStart.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} – ${wEnd.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  } else {
    navLabel = monthRef.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  }

  // ── Job card (reusable) ────────────────────────────────────────────────────
  const JobCard = ({ j }: { j: Job }) => {
    const sc = STATUS_CFG[j.status] || STATUS_CFG.scheduled;
    const col = TYPE_CFG[j.type]?.color || '#888';
    return (
      <div
        className="cal-ev"
        style={{
          background: sc.bg,
          color: sc.txt,
          borderLeftWidth: '3px',
          borderLeftStyle: 'solid',
          borderLeftColor: j.alerts && j.alerts.length ? 'var(--cds-support-error, #fa4d56)' : col,
          padding: '6px 8px',
          marginBottom: '4px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
        }}
        onClick={() => onJobClick(j)}
      >
        <p style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
          {j.time} {j.title}
        </p>
        <p style={{ opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
          {customers.find(c => c.id === j.customerId)?.name?.split(' ').slice(0, 2).join(' ')}
        </p>
        {j.alerts && j.alerts.length > 0 && (
          <p style={{ color: 'var(--cds-support-error, #fa4d56)', margin: '2px 0 0 0' }}>⚡ Alert</p>
        )}
      </div>
    );
  };

  // ── Segmented control ──────────────────────────────────────────────────────
  const SegControl = () => (
    <div style={{ display: 'flex', gap: 0, borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--cds-border-subtle)' }}>
      {(['day', 'week', 'month'] as ViewMode[]).map(v => (
        <button
          key={v}
          onClick={() => handleViewChange(v)}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            borderRight: v !== 'month' ? '1px solid var(--cds-border-subtle)' : 'none',
            background: view === v ? 'var(--cds-interactive)' : 'var(--cds-layer-02)',
            color: view === v ? '#fff' : 'var(--cds-text-secondary)',
            textTransform: 'capitalize',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );

  // ── DAY VIEW ──────────────────────────────────────────────────────────────
  const DayView = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {shownTechs.map(t => {
        const dayJobs = getDayTechJobs(t.id, dayDateStr);
        return (
          <div key={t.id} style={{ background: 'var(--cds-layer)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 14px',
              background: 'var(--cds-layer-02)',
              borderBottom: '1px solid var(--cds-border-subtle)',
            }}>
              <Avatar name={t.name} size={28} />
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--cds-text-primary)', margin: 0 }}>
                  {t.name}
                </p>
                <p style={{ fontSize: '12px', color: TECH_STATUS[t.status || 'available']?.color || '#888', margin: 0 }}>
                  {TECH_STATUS[t.status || 'available']?.label}
                </p>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
                {dayJobs.length} job{dayJobs.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ padding: '10px 12px' }}>
              {dayJobs.length > 0
                ? dayJobs.map(j => <JobCard key={j.id} j={j} />)
                : <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', margin: 0, opacity: 0.5 }}>—</p>
              }
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── WEEK VIEW ─────────────────────────────────────────────────────────────
  const WeekView = () => (
    <div className="cal-grid" style={{ overflowX: 'auto' }}>
      <table style={{ minWidth: shownTechs.length * 180 + 160, borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr className="cal-day-hdr">
            <th style={{
              padding: '12px 16px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--cds-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              border: '1px solid var(--cds-border-subtle)',
              width: 140,
              background: 'var(--cds-layer-02)',
            }}>
              Date
            </th>
            {shownTechs.map(t => (
              <th key={t.id} style={{
                padding: '12px 16px',
                border: '1px solid var(--cds-border-subtle)',
                textAlign: 'left',
                background: 'var(--cds-layer-02)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Avatar name={t.name} size={28} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--cds-text-primary)', margin: 0 }}>
                      {t.name.split(' ')[0]}
                    </p>
                    <p style={{ fontSize: '12px', color: TECH_STATUS[t.status || 'available']?.color || '#888', margin: 0 }}>
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
                <td style={{
                  padding: '8px 12px',
                  border: '1px solid var(--cds-border-subtle)',
                  background: isToday ? 'rgba(69,137,255,.06)' : 'var(--cds-background)',
                  verticalAlign: 'top',
                  width: 140,
                }}>
                  <p className={isToday ? 'cal-num today-num' : 'cal-num'} style={{
                    fontSize: '14px',
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? 'var(--cds-interactive)' : 'var(--cds-text-secondary)',
                    margin: 0,
                  }}>
                    {dl}
                  </p>
                  {isToday && <p style={{ fontSize: '11px', color: 'var(--cds-interactive)', fontWeight: 600, margin: 0 }}>TODAY</p>}
                </td>
                {shownTechs.map(t => {
                  const dayJobs = getDayTechJobs(t.id, d);
                  return (
                    <td
                      key={t.id}
                      className={isToday ? 'cal-cell today' : 'cal-cell'}
                      style={{
                        border: '1px solid var(--cds-border-subtle)',
                        verticalAlign: 'top',
                        padding: '8px',
                      }}
                    >
                      {dayJobs.map(j => <JobCard key={j.id} j={j} />)}
                      {dayJobs.length === 0 && (
                        <p style={{
                          fontSize: '12px',
                          color: 'var(--cds-border-subtle)',
                          textAlign: 'center',
                          paddingTop: '16px',
                          margin: 0,
                        }}>
                          —
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
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 420 }}>
        <thead>
          <tr>
            {DOW_LABELS.map(d => (
              <th key={d} style={{
                padding: '8px 4px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--cds-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                textAlign: 'center',
                border: '1px solid var(--cds-border-subtle)',
                background: 'var(--cds-layer-02)',
              }}>
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
                    style={{
                      border: '1px solid var(--cds-border-subtle)',
                      verticalAlign: 'top',
                      padding: '6px 8px',
                      minHeight: '80px',
                      height: '80px',
                      background: isToday ? 'rgba(69,137,255,.06)' : inMonth ? 'var(--cds-background)' : 'var(--cds-layer)',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span
                        className={isToday ? 'cal-num today-num' : 'cal-num'}
                        style={{
                          fontSize: '13px',
                          fontWeight: isToday ? 700 : 400,
                          color: isToday
                            ? '#fff'
                            : inMonth
                            ? 'var(--cds-text-primary)'
                            : 'var(--cds-text-secondary)',
                          opacity: inMonth ? 1 : 0.4,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: isToday ? 22 : 'auto',
                          height: isToday ? 22 : 'auto',
                          borderRadius: isToday ? '50%' : 0,
                          background: isToday ? 'var(--cds-interactive)' : 'transparent',
                        }}
                      >
                        {cellDate.getDate()}
                      </span>
                      {hasAlert && (
                        <span style={{
                          width: 6, height: 6,
                          borderRadius: '50%',
                          background: 'var(--cds-support-error, #fa4d56)',
                          display: 'inline-block',
                          flexShrink: 0,
                        }} />
                      )}
                    </div>
                    {cellJobs.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--cds-text-primary)',
                        }}>
                          <span style={{
                            width: 8, height: 8,
                            borderRadius: '2px',
                            background: statusColor,
                            display: 'inline-block',
                            flexShrink: 0,
                          }} />
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
    <div className="fi-anim">
      <div
        className="page-hdr"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}
      >
        <div>
          <h1>{isAdmin ? 'Master Calendar' : 'My Schedule'}</h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--cds-text-secondary)' }}>
            {isAdmin ? 'Side-by-side technician grid. Conflict detection active.' : 'Your schedule view.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <SegControl />
          <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
            <button
              className="btn btn-s btn-sm"
              onClick={prev}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronLeft size={16} />
              Prev
            </button>
            <button className="btn btn-s btn-sm" onClick={goToday}>Today</button>
            <button
              className="btn btn-s btn-sm"
              onClick={next}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--cds-text-primary)', textAlign: 'right' }}>
            {navLabel}
          </span>
        </div>
      </div>

      {view === 'day' && <DayView />}
      {view === 'week' && <WeekView />}
      {view === 'month' && <MonthView />}

      <div style={{ marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CFG).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
            <span style={{ width: 10, height: 10, background: v.bg, display: 'inline-block', borderRadius: '2px' }} />
            {v.label}
          </div>
        ))}
      </div>
    </div>
  );
}
