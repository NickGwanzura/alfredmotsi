'use client';

import React, { useState } from 'react';
import { Job, User, Customer } from '@/app/types';
import { STATUS_CFG, TYPE_CFG, TECH_STATUS } from '@/app/lib/config';
import { Avatar } from './ui';

interface CalendarViewProps {
  jobs: Job[];
  techs: User[];
  customers: Customer[];
  currentUser: User;
  onJobClick: (job: Job) => void;
}

const today = new Date();

export default function CalendarView({ jobs, techs, customers, currentUser, onJobClick }: CalendarViewProps) {
  const isAdmin = currentUser.role === "admin";
  const [wo, setWo] = useState(0);
  
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + wo * 7);
  
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const shownTechs = isAdmin ? techs : techs.filter(t => t.id === currentUser.id);
  const visJobs = isAdmin ? jobs : jobs.filter(j => j.techIds.includes(currentUser.id));
  const getDayTechJobs = (tid: string, d: string) => visJobs.filter(j => j.techIds.includes(tid) && j.date === d);
  const todayStr = today.toISOString().split("T")[0];

  return (
    <div className="fi-anim">
      <div className="page-hdr" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1>{isAdmin ? "Master Calendar" : "My Schedule"}</h1>
          <p>{isAdmin ? "Side-by-side technician grid. Conflict detection active." : "Your 7-day schedule view."}</p>
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          <button className="btn btn-s btn-sm" onClick={() => setWo(w => w - 1)}>‹ Prev</button>
          <button className="btn btn-s btn-sm" onClick={() => setWo(0)}>Today</button>
          <button className="btn btn-s btn-sm" onClick={() => setWo(w => w + 1)}>Next ›</button>
        </div>
      </div>

      <div className="cal-grid" style={{ overflowX: "auto" }}>
        <table style={{ minWidth: shownTechs.length * 180 + 160, borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr className="cal-day-hdr">
              <th style={{ 
                padding: "12px 16px", 
                fontSize: "12px", 
                fontWeight: 600, 
                color: "var(--text-secondary)", 
                textTransform: "uppercase", 
                letterSpacing: ".08em", 
                border: "1px solid var(--border-subtle)", 
                width: 140,
                background: "var(--layer-02)"
              }}>
                Date
              </th>
              {shownTechs.map(t => (
                <th key={t.id} style={{ 
                  padding: "12px 16px", 
                  border: "1px solid var(--border-subtle)", 
                  textAlign: "left",
                  background: "var(--layer-02)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Avatar name={t.name} size={28} />
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {t.name.split(" ")[0]}
                      </p>
                      <p style={{ fontSize: "12px", color: TECH_STATUS[t.status || "available"]?.color || "#888" }}>
                        {TECH_STATUS[t.status || "available"]?.label}
                      </p>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(d => {
              const isToday = d === todayStr;
              const dl = new Date(d + "T12:00").toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });
              return (
                <tr key={d}>
                  <td style={{ 
                    padding: "8px 12px", 
                    border: "1px solid var(--border-subtle)", 
                    background: isToday ? "rgba(69,137,255,.06)" : "var(--background)", 
                    verticalAlign: "top", 
                    width: 140 
                  }}>
                    <p className={isToday ? "cal-num today-num" : "cal-num"} style={{ 
                      fontSize: "14px", 
                      fontWeight: isToday ? 700 : 400, 
                      color: isToday ? "var(--interactive)" : "var(--text-secondary)" 
                    }}>
                      {dl}
                    </p>
                    {isToday && <p style={{ fontSize: "11px", color: "var(--interactive)", fontWeight: 600 }}>TODAY</p>}
                  </td>
                  {shownTechs.map(t => {
                    const dayJobs = getDayTechJobs(t.id, d);
                    return (
                      <td 
                        key={t.id} 
                        className={isToday ? "cal-cell today" : "cal-cell"}
                        style={{ 
                          border: "1px solid var(--border-subtle)", 
                          verticalAlign: "top",
                          padding: "8px"
                        }}
                      >
                        {dayJobs.map(j => {
                          const sc = STATUS_CFG[j.status] || STATUS_CFG.scheduled;
                          const col = TYPE_CFG[j.type]?.color || "#888";
                          return (
                            <div 
                              key={j.id} 
                              className="cal-ev" 
                              style={{ 
                                background: sc.bg, 
                                color: sc.txt,
                                borderLeftWidth: "3px",
                                borderLeftStyle: "solid",
                                borderLeftColor: j.alerts && j.alerts.length ? "var(--support-error)" : col,
                                padding: "6px 8px",
                                marginBottom: "4px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px"
                              }} 
                              onClick={() => onJobClick(j)}
                            >
                              <p style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                                {j.time} {j.title}
                              </p>
                              <p style={{ opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                                {customers.find(c => c.id === j.customerId)?.name?.split(" ").slice(0, 2).join(" ")}
                              </p>
                              {j.alerts && j.alerts.length > 0 && <p style={{ color: "var(--support-error)", margin: "2px 0 0 0" }}>⚡ Alert</p>}
                            </div>
                          );
                        })}
                        {dayJobs.length === 0 && (
                          <p style={{ 
                            fontSize: "12px", 
                            color: "var(--border-strong)", 
                            textAlign: "center", 
                            paddingTop: "16px",
                            margin: 0
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

      <div style={{ marginTop: "16px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {Object.entries(STATUS_CFG).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
            <span style={{ width: 10, height: 10, background: v.bg, display: "inline-block", borderRadius: "2px" }} />{v.label}
          </div>
        ))}
      </div>
    </div>
  );
}
