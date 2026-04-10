'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from "@/app/lib/auth/auth-provider";
import { Job, Customer, User, GasStockItem, GasUsageRecord, CRMRecord, PageId } from '@/app/types';
import { Avatar } from '@/app/components/ui';
import AdminDashboard from '@/app/components/AdminDashboard';
import CalendarView from '@/app/components/CalendarView';
import JobsTable from '@/app/components/JobsTable';
import CustomerDB from '@/app/components/CustomerDB';
import GasStock from '@/app/components/GasStock';
import GasUsage from '@/app/components/GasUsage';
import CRM from '@/app/components/CRM';
import ODSReport from '@/app/components/ODSReport';
import Login from '@/app/components/Login';
import AddJobModal from '@/app/components/AddJobModal';
import JobCardModal from '@/app/components/JobCardModal';
import JobCardPrint from '@/app/components/JobCardPrint';
import UserManagement from '@/app/components/UserManagement';
import PasswordChangeModal from '@/app/components/PasswordChangeModal';

// Carbon Icons
import {
  Dashboard,
  Calendar,
  Table,
  User as UserIcon,
  ContainerServices,
  ChartLine,
  FlagFilled,
  UserMultiple,
  Add,
  Logout,
} from '@carbon/icons-react';

interface NavItem {
  id: PageId;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
}

// Empty initial state - data will be fetched from API
const initialJobs: Job[] = [];
const initialCustomers: Customer[] = [];
const initialGasStock: GasStockItem[] = [];
const initialGasUsage: GasUsageRecord[] = [];
const initialCrmRecords: CRMRecord[] = [];

export default function Home() {
  const { data: session, status } = useSession();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data state - fetched from API in production
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [gasStock, setGasStock] = useState<GasStockItem[]>(initialGasStock);
  const [gasUsage, setGasUsage] = useState<GasUsageRecord[]>(initialGasUsage);
  const [crmRecords, setCrmRecords] = useState<CRMRecord[]>(initialCrmRecords);
  const [techs, setTechs] = useState<User[]>([]);
  
  const [page, setPage] = useState<PageId>("home");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAddJob, setShowAddJob] = useState(false);
  const [printJob, setPrintJob] = useState<Job | null>(null);
  const [loginTime] = useState<Date>(new Date());

  useEffect(() => {
    setIsClient(true);
    
    // Fetch data from API in production
    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  // Fetch all data from API
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch jobs
      const jobsRes = await fetch('/api/jobs');
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData);
      }
      
      // Fetch customers
      const customersRes = await fetch('/api/customers');
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData);
      }
      
      // Fetch technicians
      const techsRes = await fetch('/api/users?role=tech');
      if (techsRes.ok) {
        const techsData = await techsRes.json();
        setTechs(techsData);
      }
      
      // Fetch gas stock
      const gasStockRes = await fetch('/api/gas-stock');
      if (gasStockRes.ok) {
        const gasStockData = await gasStockRes.json();
        setGasStock(gasStockData);
      }
      
      // Fetch gas usage
      const gasUsageRes = await fetch('/api/gas-usage');
      if (gasUsageRes.ok) {
        const gasUsageData = await gasUsageRes.json();
        setGasUsage(gasUsageData);
      }
      
      // Fetch CRM records
      const crmRes = await fetch('/api/crm');
      if (crmRes.ok) {
        const crmData = await crmRes.json();
        setCrmRecords(crmData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient || status === "loading") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--cds-background)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--cds-text-primary)"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid var(--cds-border-subtle)',
            borderTopColor: 'var(--cds-interactive)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    return <Login />;
  }

  const user = session.user;
  console.log("[PAGE] User role:", user.role, "isAdmin check:", user.role === "admin");
  const isAdmin = user.role === "admin";
  const alertCount = jobs.filter(j => j.alerts && j.alerts.length > 0 && j.status !== "completed").length;
  const unallocatedCount = jobs.filter(j => j.status === "unallocated").length;

  const updateJob = async (updatedJob: Job) => {
    try {
      const res = await fetch(`/api/jobs/${updatedJob.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedJob),
      });
      
      if (res.ok) {
        setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
        setSelectedJob(updatedJob);
      }
    } catch (error) {
      console.error('Error updating job:', error);
    }
  };

  const addJob = async (newJob: Job) => {
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJob),
      });
      
      if (res.ok) {
        const createdJob = await res.json();
        setJobs(prev => [...prev, createdJob]);
        setShowAddJob(false);
        setPage("jobs");
      }
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  const adminNav: NavItem[] = [
    { id: "home", label: "Dashboard", Icon: Dashboard },
    { id: "calendar", label: "Calendar", Icon: Calendar },
    { id: "jobs", label: "Jobs", Icon: Table },
    { id: "customers", label: "Customers", Icon: UserIcon },
    { id: "gas-stock", label: "Gas Stock", Icon: ContainerServices },
    { id: "gas-usage", label: "Gas Usage", Icon: ChartLine },
    { id: "crm", label: "CRM", Icon: ChartLine },
    { id: "ods-report", label: "ODS Report", Icon: FlagFilled },
    { id: "users", label: "Users", Icon: UserMultiple },
  ];

  const techNav: NavItem[] = [
    { id: "home", label: "My Schedule", Icon: Dashboard },
    { id: "calendar", label: "Calendar", Icon: Calendar },
    { id: "jobs", label: "My Jobs", Icon: Table },
  ];

  const nav = isAdmin ? adminNav : techNav;

  return (
    <div style={{ fontFamily: "IBM Plex Sans, Helvetica Neue, Arial, sans-serif", minHeight: "100vh" }}>
      {/* Header */}
      <header className="hdr">
        <span style={{ fontSize: 20 }}>❄</span>
        <a className="hdr-name">Splash Air <span>/ Service Platform v10</span></a>
        <div style={{ flex: 1 }} />
        
        {/* Role indicator for debugging */}
        <span style={{ 
          background: isAdmin ? "var(--cds-support-success)" : "var(--cds-support-info)", 
          color: "#fff", 
          fontSize: "11px", 
          fontWeight: 700, 
          padding: "2px 8px", 
          marginRight: "8px"
        }}>
          {user.role?.toUpperCase() || "NO ROLE"}
        </span>
        
        {unallocatedCount > 0 && isAdmin && (
          <span style={{ 
            background: "var(--cds-support-warning)", 
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
            background: "var(--cds-support-error)", 
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
          borderLeft: "1px solid var(--cds-border-subtle)" 
        }}>
          <Avatar name={user.name || "User"} size={24} color={isAdmin ? "#6929c4" : "#0f62fe"} />
          <div>
            <p style={{ fontSize: "11px", color: "var(--cds-text-secondary)", fontWeight: 500 }}>{user.name}</p>
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
              <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <n.Icon size={18} />
              </span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.id === "home" && alertCount > 0 && (
                <span style={{ background: "var(--cds-support-error)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 5px" }}>
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
                style={{ color: "var(--cds-interactive)", fontWeight: 600 }} 
                onClick={() => { setShowAddJob(true); }}
              >
                <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Add size={18} />
                </span>
                Schedule Job
              </div>
            </>
          )}
        </div>
        
        <div className="snav-foot">
          <p style={{ fontSize: "11px", color: "var(--cds-text-secondary)", marginBottom: "8px" }}>
            Session started {loginTime.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <button 
            className="btn btn-g btn-sm" 
            style={{ width: "100%", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} 
            onClick={handleLogout}
          >
            <Logout size={14} />
            Sign out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="content">
        <div className="page">
          {isLoading ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '50vh',
              flexDirection: 'column',
              gap: 16
            }}>
              <div className="loading-spinner" style={{
                width: 40,
                height: 40,
                border: '3px solid var(--cds-border-subtle)',
                borderTopColor: 'var(--cds-interactive)',
                borderRadius: '50%',
              }} />
              <p style={{ color: 'var(--cds-text-secondary)' }}>Loading data...</p>
            </div>
          ) : (
            <>
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

              {!showAddJob && page === "users" && isAdmin && (
                <UserManagement currentUserId={user.id!} />
              )}
            </>
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

      {/* Password Change Modal - Forces password change on first login */}
      {/* Only show if passwordChanged is explicitly false (not undefined for existing sessions) */}
      {user.passwordChanged === false && (
        <PasswordChangeModal
          isOpen={true}
          isTempPassword={true}
          onSuccess={() => window.location.reload()}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
