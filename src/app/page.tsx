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
import AuditLogView from '@/app/components/AuditLogView';
import PasswordChangeModal from '@/app/components/PasswordChangeModal';
import AddCustomerModal from '@/app/components/AddCustomerModal';
import AddGasStockModal from '@/app/components/AddGasStockModal';
import AddGasUsageModal from '@/app/components/AddGasUsageModal';
import AddCRMModal from '@/app/components/AddCRMModal';

import { captureAudit } from '@/app/lib/audit/capture';
import {
  canManageJobs, canManageCustomers, canManageGasStock, canManageGasUsage,
  canManageCRM, canViewODSReport, canManageUsers, canViewAuditLog,
  canViewFinancials, canViewReports
} from '@/app/lib/permissions';

// Lucide icons
import {
  LayoutDashboard,
  Calendar,
  Table2,
  User as UserIcon,
  Container,
  BarChart3,
  Flag,
  Users,
  Plus,
  LogOut,
  ShieldAlert,
  Menu as MenuIcon,
  AlertTriangle,
  Snowflake,
} from 'lucide-react';

interface NavItem {
  id: PageId;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

const initialJobs: Job[] = [];
const initialCustomers: Customer[] = [];
const initialGasStock: GasStockItem[] = [];
const initialGasUsage: GasUsageRecord[] = [];
const initialCrmRecords: CRMRecord[] = [];

export default function Home() {
  const { data: session, status, update } = useSession();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const auditFiredRef = React.useRef(false);

  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [gasStock, setGasStock] = useState<GasStockItem[]>(initialGasStock);
  const [gasUsage, setGasUsage] = useState<GasUsageRecord[]>(initialGasUsage);
  const [crmRecords, setCrmRecords] = useState<CRMRecord[]>(initialCrmRecords);
  const [techs, setTechs] = useState<User[]>([]);

  const [page, setPage] = useState<PageId>('home');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAddJob, setShowAddJob] = useState(false);
  const [printJob, setPrintJob] = useState<Job | null>(null);
  const [loginTime] = useState<Date>(new Date());
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [fetchErrors, setFetchErrors] = useState<string[]>([]);

  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddGasStock, setShowAddGasStock] = useState(false);
  const [showAddGasUsage, setShowAddGasUsage] = useState(false);
  const [showAddCRM, setShowAddCRM] = useState(false);

  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({});
  const [newGasStock, setNewGasStock] = useState<Partial<GasStockItem>>({});
  const [newGasUsage, setNewGasUsage] = useState<Partial<GasUsageRecord>>({});
  const [newCRM, setNewCRM] = useState<Partial<CRMRecord>>({});

  useEffect(() => {
    setIsClient(true);
    if (status === 'authenticated') {
      fetchData();
      if (!auditFiredRef.current) {
        auditFiredRef.current = true;
        captureAudit('login');
      }
    }
  }, [status]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setFetchErrors([]);
      const errors: string[] = [];

      const [jobsRes, customersRes, techsRes, gasStockRes, gasUsageRes, crmRes] = await Promise.all([
        fetch('/api/jobs'),
        fetch('/api/customers'),
        fetch('/api/users?role=tech'),
        fetch('/api/gas-stock'),
        fetch('/api/gas-usage'),
        fetch('/api/crm'),
      ]);

      if (jobsRes.ok) setJobs(await jobsRes.json());
      else errors.push('Failed to load jobs');

      if (customersRes.ok) setCustomers(await customersRes.json());
      if (techsRes.ok) setTechs(await techsRes.json());

      if (gasStockRes.ok) setGasStock(await gasStockRes.json());
      else errors.push('Failed to load gas stock');

      if (gasUsageRes.ok) setGasUsage(await gasUsageRes.json());
      else errors.push('Failed to load gas usage');

      if (crmRes.ok) setCrmRecords(await crmRes.json());
      else errors.push('Failed to load CRM records');

      if (errors.length > 0) setFetchErrors(errors);
    } catch {
      setFetchErrors(['Network error — check your connection']);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient || status === 'loading') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-text-primary">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-border-subtle border-t-interactive rounded-full animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !session) {
    return <Login />;
  }

  const user = session.user;
  const currentUser = user as User;
  const isAdmin = user.role === 'admin';

  const perm = {
    canManageJobs: canManageJobs(user.role),
    canManageCustomers: canManageCustomers(user.role),
    canManageGasStock: canManageGasStock(user.role),
    canManageGasUsage: canManageGasUsage(user.role),
    canManageCRM: canManageCRM(user.role),
    canViewODSReport: canViewODSReport(user.role),
    canManageUsers: canManageUsers(user.role),
    canViewAuditLog: canViewAuditLog(user.role),
    canViewFinancials: canViewFinancials(user.role),
  };

  const alertCount = jobs.filter((j) => j.alerts && j.alerts.length > 0 && j.status !== 'completed').length;
  const unallocatedCount = jobs.filter((j) => j.status === 'unallocated').length;

  const updateJob = async (updatedJob: Job) => {
    try {
      const prevJob = jobs.find((j) => j.id === updatedJob.id);
      const res = await fetch(`/api/jobs/${updatedJob.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedJob),
      });
      if (res.ok) {
        setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
        setSelectedJob(updatedJob);
        if (updatedJob.status === 'completed' && prevJob?.status !== 'completed') {
          fetch('/api/notifications/job-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: updatedJob.id }),
          }).catch(() => {});
        }
      }
    } catch (error) {
      console.error('Error updating job:', error);
    }
  };

  const deleteJob = async (jobId: string, reason: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) return false;
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setSelectedJob(null);
      return true;
    } catch {
      return false;
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
        setJobs((prev) => [...prev, createdJob]);
        setShowAddJob(false);
        setPage('jobs');
      }
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };

  const addCustomer = async (customerData: Partial<Customer>) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
      if (res.ok) {
        const createdCustomer = await res.json();
        setCustomers((prev) => [...prev, createdCustomer]);
        setShowAddCustomer(false);
        setNewCustomer({});
      }
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  };

  const addGasStock = async (stockData: Partial<GasStockItem>) => {
    const res = await fetch('/api/gas-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stockData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${res.status}`);
    }
    const createdStock = await res.json();
    setGasStock((prev) => [...prev, createdStock]);
    setShowAddGasStock(false);
    setNewGasStock({});
  };

  const addGasUsage = async (usageData: Partial<GasUsageRecord>) => {
    try {
      const res = await fetch('/api/gas-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usageData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      const createdUsage = await res.json();
      setGasUsage((prev) => [...prev, createdUsage]);

      const stockRes = await fetch('/api/gas-stock');
      if (stockRes.ok) setGasStock(await stockRes.json());

      const jobsRes = await fetch('/api/jobs');
      if (jobsRes.ok) setJobs(await jobsRes.json());

      setShowAddGasUsage(false);
      setNewGasUsage({});
    } catch (error) {
      console.error('Error recording gas usage:', error);
    }
  };

  const addCRMRecord = async (crmData: Partial<CRMRecord>) => {
    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crmData),
      });
      if (res.ok) {
        const createdRecord = await res.json();
        setCrmRecords((prev) => [...prev, createdRecord]);
        setShowAddCRM(false);
        setNewCRM({});
      }
    } catch (error) {
      console.error('Error creating CRM record:', error);
    }
  };

  const handleLogout = () => signOut({ callbackUrl: '/' });

  const adminNav: NavItem[] = [
    { id: 'home', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendar', Icon: Calendar },
    { id: 'jobs', label: 'Jobs', Icon: Table2 },
    { id: 'customers', label: 'Customers', Icon: UserIcon },
    { id: 'gas-stock', label: 'Gas Stock', Icon: Container },
    { id: 'gas-usage', label: 'Gas Usage', Icon: BarChart3 },
    { id: 'crm', label: 'CRM', Icon: BarChart3 },
    { id: 'ods-report', label: 'ODS Report', Icon: Flag },
    { id: 'users', label: 'Users', Icon: Users },
    { id: 'audit-log', label: 'Audit Log', Icon: ShieldAlert },
  ];

  const techNav: NavItem[] = [
    { id: 'home', label: 'My Schedule', Icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendar', Icon: Calendar },
    { id: 'jobs', label: 'My Jobs', Icon: Table2 },
  ];

  const nav = isAdmin ? adminNav : techNav;

  return (
    <div className="min-h-screen" style={{ fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif" }}>
      {/* Header */}
      <header className="header no-print">
        <button
          className="inline-flex items-center justify-center w-10 h-10 bg-transparent hover:bg-surface-hover active:bg-surface-active border-none cursor-pointer shrink-0 lg:hidden"
          onClick={() => setSideNavOpen((o) => !o)}
          aria-label="Toggle navigation"
        >
          <MenuIcon size={20} />
        </button>
        <Snowflake size={20} className="text-brand-600" />
        <a className="flex items-center gap-2 px-4 h-12 border-l border-border-subtle text-sm font-semibold text-text-primary no-underline">
          Splash Air <span className="font-normal text-text-secondary">/ Service Platform v10</span>
        </a>
        <div className="flex-1" />

        {/* Role badge */}
        <span className={`text-[11px] font-bold px-2 py-0.5 text-white ${isAdmin ? 'bg-support-success' : 'bg-support-info'}`}>
          {user.role?.toUpperCase() || 'NO ROLE'}
        </span>

        {unallocatedCount > 0 && perm.canManageJobs && (
          <span className="text-[11px] font-bold px-2 py-0.5 text-white bg-support-warning">
            {unallocatedCount} UNALLOCATED
          </span>
        )}

        {alertCount > 0 && (
          <span className="text-[11px] font-bold px-2 py-0.5 text-white bg-support-error">
            {alertCount} ALERT{alertCount > 1 ? 'S' : ''}
          </span>
        )}

        <div className="flex items-center gap-3 pl-4 border-l border-border-subtle">
          <Avatar name={user.name || 'User'} size={24} color={isAdmin ? '#6929c4' : '#00695c'} />
          <div className="hidden sm:block">
            <p className="text-[11px] text-text-secondary font-medium">{user.name}</p>
            <p className={`text-[11px] ${isAdmin ? 'text-[#6929c4]' : 'text-brand-600'}`}>
              {isAdmin ? 'Administrator' : 'Technician'}
            </p>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {sideNavOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[45]"
          onClick={() => setSideNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav className={`sidebar no-print ${sideNavOpen ? 'open' : ''}`}>
        <div className="flex-1 overflow-y-auto py-5">
          <p className="px-5 pb-1 text-[11px] font-semibold text-text-primary uppercase tracking-[0.08em]">Navigation</p>
          {nav.map((n) => {
            const isActive = page === n.id;
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                className={`flex items-center gap-4 h-8 px-5 cursor-pointer text-sm text-text-secondary border-l-4 border-transparent transition-colors duration-100 select-none ${
                  isActive
                    ? 'bg-layer-selected text-text-primary border-l-interactive font-semibold'
                    : 'hover:bg-layer-hover hover:text-text-primary'
                }`}
                onClick={() => {
                  setPage(n.id);
                  setShowAddJob(false);
                  setSideNavOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setPage(n.id);
                    setShowAddJob(false);
                    setSideNavOpen(false);
                  }
                }}
              >
                <span className="w-5 flex items-center justify-center shrink-0">
                  <n.Icon size={18} />
                </span>
                <span className="flex-1">{n.label}</span>
                {n.id === 'home' && alertCount > 0 && (
                  <span className="bg-support-error text-white text-[10px] font-bold px-1 py-0.5">
                    {alertCount}
                  </span>
                )}
              </div>
            );
          })}

          {perm.canManageJobs && (
            <>
              <div className="h-px bg-border-subtle my-4 mx-0" />
              <p className="px-5 pb-1 text-[11px] font-semibold text-text-primary uppercase tracking-[0.08em]">Actions</p>
              <div
                role="button"
                tabIndex={0}
                className="flex items-center gap-4 h-8 px-5 cursor-pointer text-sm text-interactive font-semibold border-l-4 border-transparent hover:bg-layer-hover"
                onClick={() => setShowAddJob(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowAddJob(true);
                  }
                }}
              >
                <span className="w-5 flex items-center justify-center shrink-0">
                  <Plus size={18} />
                </span>
                Schedule Job
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-border-subtle">
          <p className="text-[10px] text-text-secondary text-center leading-tight mb-3">
            System developed &amp; maintained by<br />
            <a href="https://www.spiritusglobal.tech" target="_blank" rel="noopener noreferrer" className="text-interactive hover:text-interactive-hover underline">
              Spiritus Systems
            </a>
          </p>
          <p className="text-[11px] text-text-secondary mb-2">
            Session started{' '}
            {loginTime.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <button
            className="inline-flex items-center justify-center gap-2 w-full h-8 px-3 text-xs bg-transparent border border-border-strong text-text-primary hover:bg-surface-hover active:bg-surface-active cursor-pointer transition-colors"
            onClick={handleLogout}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="content-area">
        <div className="p-8">
          {fetchErrors.length > 0 && (
            <div className="mb-4">
              {fetchErrors.map((msg, i) => (
                <div key={i} className="flex items-start gap-3 p-4 mb-1 bg-red-50 border-l-4 border-l-support-error text-red-800" role="alert">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span className="flex-1 text-sm">{msg}</span>
                  <button
                    onClick={() => setFetchErrors([])}
                    className="bg-transparent border-none cursor-pointer text-inherit p-0 shrink-0"
                    aria-label="Dismiss error"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                className="inline-flex items-center justify-center gap-2 h-8 px-3 text-xs bg-transparent border border-border-strong text-text-primary hover:bg-surface-hover active:bg-surface-active cursor-pointer mt-2"
                onClick={fetchData}
              >
                Retry
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-4 h-[50vh] text-text-secondary">
              <div className="w-10 h-10 border-3 border-border-subtle border-t-interactive rounded-full animate-spin" />
              <p>Loading data...</p>
            </div>
          ) : (
            <>
              {showAddJob && perm.canManageJobs && (
                <AddJobModal
                  techs={techs}
                  customers={customers}
                  jobs={jobs}
                  onSave={addJob}
                  onClose={() => setShowAddJob(false)}
                />
              )}

              {!showAddJob && page === 'home' && perm.canManageJobs && (
                <AdminDashboard
                  jobs={jobs}
                  techs={techs}
                  customers={customers}
                  gasStock={gasStock}
                  gasUsage={gasUsage}
                  onJobClick={setSelectedJob}
                />
              )}

              {!showAddJob && page === 'home' && !perm.canManageJobs && (
                <CalendarView jobs={jobs} techs={techs} customers={customers} currentUser={currentUser} onJobClick={setSelectedJob} />
              )}

              {!showAddJob && page === 'calendar' && (
                <CalendarView jobs={jobs} techs={techs} customers={customers} currentUser={currentUser} onJobClick={setSelectedJob} />
              )}

              {!showAddJob && page === 'jobs' && (
                <JobsTable
                  jobs={jobs}
                  techs={techs}
                  customers={customers}
                  currentUser={currentUser}
                  gasUsage={gasUsage}
                  onJobClick={setSelectedJob}
                  onAddJob={perm.canManageJobs ? () => setShowAddJob(true) : undefined}
                />
              )}

              {!showAddJob && page === 'customers' && perm.canManageCustomers && (
                <CustomerDB
                  customers={customers}
                  jobs={jobs}
                  currentUser={currentUser}
                  onJobClick={setSelectedJob}
                  onAddCustomer={(customer) => {
                    setNewCustomer(customer);
                    setShowAddCustomer(true);
                  }}
                />
              )}

              {!showAddJob && page === 'gas-stock' && perm.canManageGasStock && (
                <GasStock
                  stock={gasStock}
                  currentUser={currentUser}
                  onAdd={(item) => {
                    setNewGasStock(item);
                    setShowAddGasStock(true);
                  }}
                  onRefresh={fetchData}
                />
              )}

              {!showAddJob && page === 'gas-usage' && perm.canManageGasUsage && (
                <GasUsage
                  usage={gasUsage}
                  currentUser={currentUser}
                  stock={gasStock.map((s) => ({ id: s.id, gasType: s.gasType, remaining: s.remaining, unit: s.unit }))}
                  customers={customers.map((c) => ({ id: c.id, name: c.name }))}
                  jobs={jobs.map((j) => ({ id: j.id, title: j.title, jobCardRef: j.jobCardRef }))}
                  onAdd={(record) => {
                    setNewGasUsage(record);
                    setShowAddGasUsage(true);
                  }}
                />
              )}

              {!showAddJob && page === 'crm' && perm.canManageCRM && (
                <CRM
                  records={crmRecords}
                  customers={customers}
                  onAdd={(record) => {
                    setNewCRM(record);
                    setShowAddCRM(true);
                  }}
                />
              )}

              {!showAddJob && page === 'ods-report' && perm.canViewODSReport && (
                <ODSReport jobs={jobs} customers={customers} currentUser={currentUser} />
              )}

              {!showAddJob && page === 'users' && perm.canManageUsers && (
                <UserManagement currentUserId={user.id!} />
              )}

              {!showAddJob && page === 'audit-log' && perm.canViewAuditLog && (
                <AuditLogView techs={techs} />
              )}
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      {selectedJob && (
        <JobCardModal
          job={selectedJob}
          customers={customers}
          currentUser={currentUser}
          gasUsage={gasUsage}
          onClose={() => setSelectedJob(null)}
          onUpdate={updateJob}
          onDelete={perm.canManageJobs ? deleteJob : undefined}
          onPrint={(job) => {
            setPrintJob(job);
            setSelectedJob(null);
          }}
        />
      )}

      {printJob && (
        <JobCardPrint
          job={printJob}
          customer={customers.find((c) => c.id === printJob.customerId)}
          technician={techs.find((t) => printJob.techIds.includes(t.id))}
          onClose={() => setPrintJob(null)}
        />
      )}

      {(user as any).passwordChanged === false && (
        <PasswordChangeModal
          isOpen={true}
          isTempPassword={true}
          onSuccess={async () => {
            await update();
          }}
          onLogout={handleLogout}
        />
      )}

      {showAddCustomer && (
        <AddCustomerModal
          customer={newCustomer}
          onChange={setNewCustomer}
          onSave={() => addCustomer(newCustomer)}
          onClose={() => setShowAddCustomer(false)}
        />
      )}

      {showAddGasStock && (
        <AddGasStockModal
          stock={newGasStock}
          onChange={setNewGasStock}
          onSave={() => addGasStock(newGasStock)}
          onClose={() => setShowAddGasStock(false)}
        />
      )}

      {showAddGasUsage && (
        <AddGasUsageModal
          usage={newGasUsage}
          stock={gasStock}
          customers={customers}
          jobs={jobs}
          onChange={setNewGasUsage}
          onSave={() => addGasUsage(newGasUsage)}
          onClose={() => setShowAddGasUsage(false)}
        />
      )}

      {showAddCRM && (
        <AddCRMModal
          record={newCRM}
          customers={customers}
          onChange={setNewCRM}
          onSave={() => addCRMRecord(newCRM)}
          onClose={() => setShowAddCRM(false)}
        />
      )}
    </div>
  );
}
