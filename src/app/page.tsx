'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from "@/app/lib/auth/auth-provider";
import { Job, Customer, User, GasStockItem, GasUsageRecord, CRMRecord, PageId, NavItem } from '@/app/types';
import { SEED_CUSTOMERS, SEED_JOBS, SEED_GAS_STOCK, SEED_GAS_USAGE, SEED_CRM } from '@/app/data/seed';
import { Avatar } from '@/app/components/ui';
// import Login from '@/app/components/Login'; // Disabled for dev - auth bypassed
import AdminDashboard from '@/app/components/AdminDashboard';
import CalendarView from '@/app/components/CalendarView';
import JobsTable from '@/app/components/JobsTable';
import CustomerDB from '@/app/components/CustomerDB';
import GasStock from '@/app/components/GasStock';
import GasUsage from '@/app/components/GasUsage';
import CRM from '@/app/components/CRM';
import ODSReport from '@/app/components/ODSReport';
import AddJobModal from '@/app/components/AddJobModal';
import JobCardModal from '@/app/components/JobCardModal';
import JobCardPrint from '@/app/components/JobCardPrint';

export default function Home() {
  const { data: session, status } = useSession();
  const [isClient, setIsClient] = useState(false);
  
  const [jobs, setJobs] = useState<Job[]>(SEED_JOBS);
  const [customers] = useState<Customer[]>(SEED_CUSTOMERS);
  const [gasStock, setGasStock] = useState<GasStockItem[]>(SEED_GAS_STOCK);
  const [gasUsage, setGasUsage] = useState<GasUsageRecord[]>(SEED_GAS_USAGE);
  const [crmRecords, setCrmRecords] = useState<CRMRecord[]>(SEED_CRM);
  
  const [page, setPage] = useState<PageId>("home");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAddJob, setShowAddJob] = useState(false);
  const [printJob, setPrintJob] = useState<Job | null>(null);
  const [loginTime] = useState<Date>(new Date());

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || status === "loading") {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "#f4f4f4", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "#161616"
      }}>
        Loading...
      </div>
    );
  }

  const user = session!.user;
  const isAdmin = user.role === "admin";
  const alertCount = jobs.filter(j => j.alerts && j.alerts.length > 0 && j.status !== "completed").length;
  const unallocatedCount = jobs.filter(j => j.status === "unallocated").length;

  const updateJob = (updatedJob: Job) => {
    setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
    setSelectedJob(updatedJob);
  };

  const addJob = (newJob: Job) => {
    setJobs(prev => [...prev, newJob]);
    setShowAddJob(false);
    setPage("jobs");
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  const techs: User[] = [];

  const adminNav: NavItem[] = [
    { id: "home", label: "Dashboard", icon: "⊞" },
    { id: "calendar", label: "Calendar", icon: "⊟" },
    { id: "jobs", label: "Jobs", icon: "⊡" },
    { id: "customers", label: "Customers", icon: "⬡" },
    { id: "gas-stock", label: "Gas Stock", icon: "◉" },
    { id: "gas-usage", label: "Gas Usage", icon: "◈" },
    { id: "crm", label: "CRM", icon: "◎" },
    { id: "ods-report", label: "ODS Report", icon: "⚑" },
  ];

  const techNav: NavItem[] = [
    { id: "home", label: "My Schedule", icon: "⊞" },
    { id: "calendar", label: "Calendar", icon: "⊟" },
    { id: "jobs", label: "My Jobs", icon: "⊡" },
  ];

  const nav = isAdmin ? adminNav : techNav;

  return (
    <div style={{ fontFamily: "IBM Plex Sans, Helvetica Neue, Arial, sans-serif", minHeight: "100vh" }}>
      {/* Header */}
      <header className="hdr">
        <span style={{ fontSize: 20 }}>❄</span>
        <a className="hdr-name">Splash Air <span>/ Service Platform v10</span></a>
        <div style={{ flex: 1 }} />
        
        {unallocatedCount > 0 && isAdmin && (
          <span style={{ 
            background: "#b28600", 
            color: "#fff", 
            fontSize: "11px", 
            fontWeight: 700, 
            padding: "2px 8px", 
            marginRight: "8px"
          }}>
            {unallocatedCount} UNALLOCATED
          </span>
        )}
        
        {alertCount > 0 && (
          <span style={{ 
            background: "#da1e28", 
            color: "#fff", 
            fontSize: "11px", 
            fontWeight: 700, 
            padding: "2px 8px",
            marginRight: "8px"
          }}>
            {alertCount} ALERT{alertCount > 1 ? "S" : ""}
          </span>
        )}
        
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "12px", 
          paddingLeft: "16px", 
          borderLeft: "1px solid var(--bs1)" 
        }}>
          <Avatar name={user.name || "User"} size={24} color={isAdmin ? "#6929c4" : "#0f62fe"} />
          <div>
            <p style={{ fontSize: "11px", color: "var(--tp)", fontWeight: 500 }}>{user.name}</p>
            <p style={{ fontSize: "11px", color: isAdmin ? "#6929c4" : "#0f62fe" }}>
              {isAdmin ? "Administrator" : "Technician"}
            </p>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <nav className="snav">
        <div className="snav-items">
          <p className="snav-sec">Navigation</p>
          {nav.map(n => (
            <div 
              key={n.id} 
              className={`snav-item ${page === n.id ? "active" : ""}`} 
              onClick={() => { setPage(n.id); setShowAddJob(false); }}
            >
              <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{n.icon}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.id === "home" && alertCount > 0 && (
                <span style={{ background: "#da1e28", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 5px" }}>
                  {alertCount}
                </span>
              )}
            </div>
          ))}
          
          {isAdmin && (
            <>
              <div className="snav-div" />
              <p className="snav-sec">Actions</p>
              <div 
                className="snav-item" 
                style={{ color: "#0f62fe", fontWeight: 600 }} 
                onClick={() => { setShowAddJob(true); }}
              >
                <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>+</span>
                Schedule Job
              </div>
            </>
          )}
        </div>
        
        <div className="snav-foot">
          <p style={{ fontSize: "11px", color: "var(--ts)", marginBottom: "8px" }}>
            Session started {loginTime.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <button 
            className="btn btn-g btn-sm" 
            style={{ width: "100%", justifyContent: "center" }} 
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="content">
        <div className="page">
          {showAddJob && isAdmin && (
            <AddJobModal 
              techs={techs} 
              customers={customers} 
              jobs={jobs} 
              onSave={addJob} 
              onClose={() => { setShowAddJob(false); }} 
            />
          )}
          
          {!showAddJob && page === "home" && isAdmin && (
            <AdminDashboard 
              jobs={jobs} 
              techs={techs} 
              customers={customers} 
              onJobClick={setSelectedJob} 
            />
          )}
          
          {!showAddJob && page === "home" && !isAdmin && (
            <CalendarView 
              jobs={jobs} 
              techs={techs} 
              customers={customers} 
              currentUser={user as any} 
              onJobClick={setSelectedJob} 
            />
          )}
          
          {!showAddJob && page === "calendar" && (
            <CalendarView 
              jobs={jobs} 
              techs={techs} 
              customers={customers} 
              currentUser={user as any} 
              onJobClick={setSelectedJob} 
            />
          )}
          
          {!showAddJob && page === "jobs" && (
            <JobsTable 
              jobs={jobs} 
              techs={techs} 
              customers={customers} 
              currentUser={user as any} 
              onJobClick={setSelectedJob} 
            />
          )}
          
          {!showAddJob && page === "customers" && isAdmin && (
            <CustomerDB 
              customers={customers} 
              jobs={jobs} 
              onJobClick={setSelectedJob} 
            />
          )}
          
          {!showAddJob && page === "gas-stock" && isAdmin && (
            <GasStock 
              stock={gasStock} 
            />
          )}
          
          {!showAddJob && page === "gas-usage" && isAdmin && (
            <GasUsage 
              usage={gasUsage} 
            />
          )}
          
          {!showAddJob && page === "crm" && isAdmin && (
            <CRM 
              records={crmRecords}
              customers={customers}
            />
          )}
          
          {!showAddJob && page === "ods-report" && isAdmin && (
            <ODSReport 
              jobs={jobs}
              customers={customers}
            />
          )}
        </div>
      </main>

      {/* Job Card Modal */}
      {selectedJob && (
        <JobCardModal 
          job={selectedJob} 
          customers={customers} 
          currentUser={user as any} 
          onClose={() => setSelectedJob(null)} 
          onUpdate={updateJob}
          onPrint={(job) => { setPrintJob(job); setSelectedJob(null); }}
        />
      )}

      {/* Print Modal */}
      {printJob && (
        <JobCardPrint
          job={printJob}
          customer={customers.find(c => c.id === printJob.customerId)}
          technician={techs.find(t => printJob.techIds.includes(t.id))}
          onClose={() => setPrintJob(null)}
        />
      )}
    </div>
  );
}
