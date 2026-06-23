'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, FormItem, Notification } from './ui';
import { X, Plus, Mail, Trash2, FileEdit, AlertTriangle } from 'lucide-react';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'tech' | 'client';
  phone?: string | null;
  specialty?: string | null;
  status?: string | null;
  createdAt: string;
}

const ROLE_TAG: Record<string, { bg: string; txt: string; label: string }> = {
  admin:  { bg: '#491d8b22', txt: '#491d8b', label: 'Administrator' },
  tech:   { bg: '#0043ce22', txt: '#0043ce', label: 'Technician'    },
  client: { bg: '#005d5d22', txt: '#005d5d', label: 'Client'        },
};

function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$!';
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const base = [pick(upper), pick(upper), pick(lower), pick(lower), pick(digits), pick(digits), pick(special)];
  for (let i = 0; i < 3; i++) base.push(pick(upper + lower + digits));
  return base.sort(() => Math.random() - 0.5).join('');
}

type ModalState = 'none' | 'invite' | 'edit' | 'delete' | 'resend';

export default function UserManagement({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState('');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<ModalState>('none');
  const [target, setTarget] = useState<ManagedUser | null>(null);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'tech', phone: '', specialty: '' });
  const [tempPw, setTempPw] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteErr, setInviteErr] = useState('');
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'tech', phone: '', specialty: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editErr, setEditErr] = useState('');
  const [resending, setResending] = useState(false);
  const [resendErr, setResendErr] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deduping, setDeduping] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 5000); };

  const loadUsers = useCallback(async () => {
    setLoading(true); setPageErr('');
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.users);
    } catch { setPageErr('Could not load users. Please refresh.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const emailCounts = users.reduce<Record<string, number>>((acc, u) => {
    const k = u.email.toLowerCase(); acc[k] = (acc[k] || 0) + 1; return acc;
  }, {});
  const dupCount = Object.values(emailCounts).filter(c => c > 1).reduce((a, c) => a + c - 1, 0);

  function openInvite() {
    setInviteForm({ name: '', email: '', role: 'tech', phone: '', specialty: '' });
    setTempPw(generateTempPassword()); setInviteErr(''); setCopied(false); setModal('invite');
  }

  async function handleInvite() {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) { setInviteErr('Name and email are required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email)) { setInviteErr('Enter a valid email address.'); return; }
    setInviting(true); setInviteErr('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...inviteForm, tempPassword: tempPw }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteErr(data.error || 'Failed to create user.'); return; }
      await fetch('/api/email/user-invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: inviteForm.email, userName: inviteForm.name, tempPassword: tempPw, role: inviteForm.role, loginUrl: `${window.location.origin}/` }),
      });
      setModal('none'); showToast(`${inviteForm.name} invited — credentials sent to ${inviteForm.email}.`);
      await loadUsers();
    } catch { setInviteErr('An error occurred. Please try again.'); }
    finally { setInviting(false); }
  }

  function openEdit(u: ManagedUser) {
    setTarget(u); setEditForm({ name: u.name, email: u.email, role: u.role, phone: u.phone || '', specialty: u.specialty || '' });
    setEditErr(''); setModal('edit');
  }

  async function handleEdit() {
    if (!editForm.name.trim() || !editForm.email.trim()) { setEditErr('Name and email are required.'); return; }
    if (!target) return;
    setEditLoading(true); setEditErr('');
    try {
      const res = await fetch(`/api/admin/users/${target.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) { setEditErr(data.error || 'Failed to save changes.'); return; }
      setUsers(prev => prev.map(u => u.id === target.id ? { ...u, ...data.user } : u));
      setModal('none'); showToast(`${editForm.name} updated successfully.`);
    } catch { setEditErr('An error occurred. Please try again.'); }
    finally { setEditLoading(false); }
  }

  function openResend(u: ManagedUser) { setTarget(u); setResendErr(''); setModal('resend'); }

  async function handleResend() {
    if (!target) return;
    setResending(true); setResendErr('');
    try {
      const res = await fetch('/api/admin/users/resend-credentials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: target.id }),
      });
      const data = await res.json();
      if (!res.ok) { setResendErr(data.error || 'Failed to resend.'); return; }
      setModal('none'); showToast(`New credentials sent to ${target.email}.`);
    } catch { setResendErr('An error occurred. Please try again.'); }
    finally { setResending(false); }
  }

  function openDelete(u: ManagedUser) { setTarget(u); setModal('delete'); }

  async function handleDelete() {
    if (!target) return; setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${target.id}`, { method: 'DELETE' });
      if (res.ok) { setUsers(prev => prev.filter(u => u.id !== target.id)); setModal('none'); showToast(`${target.name} removed.`); }
      else { const d = await res.json(); alert(d.error || 'Failed to delete user'); }
    } finally { setDeleting(false); }
  }

  async function handleCleanDuplicates() {
    setDeduping(true);
    try {
      const res = await fetch('/api/admin/users/cleanup-duplicates', { method: 'POST' });
      const data = await res.json();
      if (res.ok) { showToast(data.removed > 0 ? `${data.removed} duplicate account${data.removed > 1 ? 's' : ''} removed.` : 'No duplicates found.'); await loadUsers(); }
      else { alert(data.error || 'Failed to clean duplicates'); }
    } finally { setDeduping(false); }
  }

  function copyPassword() { navigator.clipboard.writeText(tempPw).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }

  const admins = users.filter(u => u.role === 'admin').length;
  const techsCount = users.filter(u => u.role === 'tech').length;

  const tb = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs';

  return (
    <div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-support-success text-white px-5 py-3 text-sm font-medium shadow-lg max-w-[380px]">
          {toast}
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">User Management</h1>
          <p className="text-sm text-text-secondary">Invite staff, manage roles, and control access to the platform.</p>
        </div>
        <div className="flex gap-2">
          {dupCount > 0 && (
            <button className={`${tb} bg-support-error text-white border-none cursor-pointer hover:opacity-90 transition-opacity`}
              onClick={handleCleanDuplicates} disabled={deduping}>
              <AlertTriangle size={16} />{deduping ? 'Cleaning...' : `Remove ${dupCount} Duplicate${dupCount > 1 ? 's' : ''}`}
            </button>
          )}
          <button className={`${tb} bg-interactive text-white border-none cursor-pointer hover:bg-interactive-hover transition-colors gap-2`} onClick={openInvite}>
            <Plus size={16} /> Invite User
          </button>
        </div>
      </div>

      {pageErr && <Notification kind="e" title="Error" body={pageErr} />}

      {dupCount > 0 && (
        <div className="flex items-start gap-3 p-4 mb-4 bg-amber-50 border-l-4 border-l-support-warning">
          <div>
            <div className="font-semibold text-sm text-text-primary">{dupCount} duplicate account{dupCount > 1 ? 's' : ''} detected</div>
            <div className="text-sm text-text-secondary">Multiple accounts share the same email. Click "Remove Duplicates" to keep the oldest account per email and delete the rest.</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-layer p-4 border-t-4 border-t-interactive">
          <div className="text-3xl font-bold text-text-primary">{users.length}</div>
          <div className="text-xs text-text-secondary mt-1">Total Users</div>
        </div>
        <div className="bg-layer p-4 border-t-4 border-t-interactive">
          <div className="text-3xl font-bold text-text-primary">{admins}</div>
          <div className="text-xs text-text-secondary mt-1">Administrators</div>
        </div>
        <div className="bg-layer p-4 border-t-4 border-t-interactive">
          <div className="text-3xl font-bold text-text-primary">{techsCount}</div>
          <div className="text-xs text-text-secondary mt-1">Technicians</div>
        </div>
      </div>

      <div className="overflow-x-auto border border-border-subtle">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface">
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">User</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Email</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Role</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Phone</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Specialty</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle">Joined</th>
              <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] px-4 py-3 border-b border-border-subtle" style={{ width: 148 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="text-center text-text-secondary p-8 text-sm">Loading users...</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={7} className="text-center text-text-secondary p-8 text-sm">No users found. Invite your first team member.</td></tr>
            )}
            {!loading && users.map(u => {
              const role = ROLE_TAG[u.role] || ROLE_TAG.tech;
              const isSelf = u.id === currentUserId;
              const isDuplicate = emailCounts[u.email.toLowerCase()] > 1;
              return (
                <tr key={u.id} className="border-b border-border-subtle hover:bg-surface-hover transition-colors" style={isDuplicate ? { background: '#fff1f1' } : undefined}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.name} size={28} color={u.role === 'admin' ? '#6929c4' : u.role === 'tech' ? '#0f62fe' : '#005d5d'} />
                      <span className="font-medium text-text-primary">
                        {u.name}
                        {isSelf && <span className="text-xs text-text-secondary ml-1.5">(you)</span>}
                        {isDuplicate && <span className="text-xs text-support-error ml-1.5">duplicate</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center h-6 px-2 text-[11px] font-medium" style={{ background: role.bg, color: role.txt }}>{role.label}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{u.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{u.specialty || '—'}</td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{new Date(u.createdAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-0.5">
                      <button className={`${tb} bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors`} onClick={() => openEdit(u)} title="Edit user"><FileEdit size={14} /> Edit</button>
                      <button className={`${tb} bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors`} onClick={() => openResend(u)} title="Resend login credentials"><Mail size={14} /></button>
                      {!isSelf && (
                        <button className={`${tb} bg-support-error text-white border-none cursor-pointer hover:opacity-90 transition-opacity`} onClick={() => openDelete(u)} title="Remove user"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {modal === 'invite' && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-start justify-center overflow-y-auto p-12" onClick={() => setModal('none')}>
          <div className="bg-layer w-full max-w-[780px] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6 border-b border-border-subtle">
              <div>
                <p className="text-xs text-text-secondary font-semibold uppercase tracking-[0.08em]">User Management</p>
                <h2 className="text-xl font-semibold text-text-primary mt-1">Invite Team Member</h2>
              </div>
              <button className="bg-transparent border-none cursor-pointer text-text-secondary hover:text-text-primary p-1" onClick={() => setModal('none')}><X size={20} /></button>
            </div>
            <div className="p-6">
              {inviteErr && <Notification kind="e" title="Check form" body={inviteErr} />}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <FormItem label="Full name *"><input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" placeholder="e.g. Tendai Moyo" value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} /></FormItem>
                <FormItem label="Email address *"><input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" type="email" placeholder="e.g. tendai@company.com" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} /></FormItem>
              </div>
              <FormItem label="Role *" helper="Administrators have full access. Technicians can only view their assigned jobs.">
                <select className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="tech">Technician</option><option value="admin">Administrator</option>
                </select>
              </FormItem>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <FormItem label="Phone number"><input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" placeholder="e.g. +263 77 123 4567" value={inviteForm.phone} onChange={e => setInviteForm(f => ({ ...f, phone: e.target.value }))} /></FormItem>
                <FormItem label="Specialty" helper="e.g. VRV/VRF, Refrigeration"><input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" placeholder="e.g. Split Systems, Ducted" value={inviteForm.specialty} onChange={e => setInviteForm(f => ({ ...f, specialty: e.target.value }))} /></FormItem>
              </div>
              <hr className="border-border-subtle my-4" />
              <FormItem label="Temporary password" helper="Generated automatically. Will be emailed to the user.">
                <div className="flex">
                  <input className="w-full h-9 px-3 text-sm bg-surface-hover border border-border-strong outline-none mono tracking-wider" value={tempPw} readOnly />
                  <button className={`${tb} bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors ${copied ? 'bg-support-success text-white border-support-success' : ''}`} onClick={copyPassword}>{copied ? '✓ Copied' : 'Copy'}</button>
                  <button className={`${tb} bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors`} onClick={() => { setTempPw(generateTempPassword()); setCopied(false); }}>New</button>
                </div>
              </FormItem>
              <div className="flex items-start gap-3 p-4 mt-4 bg-blue-50 border-l-4 border-l-support-info">
                <div>
                  <div className="font-semibold text-sm text-text-primary">Login credentials will be emailed</div>
                  <div className="text-sm text-text-secondary">{inviteForm.email || 'The user'} will receive their username and temporary password by email.</div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border-subtle bg-surface">
              <button className={`${tb} bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors`} onClick={() => setModal('none')}>Cancel</button>
              <button className={`${tb} bg-interactive text-white border-none cursor-pointer hover:bg-interactive-hover transition-colors`} onClick={handleInvite} disabled={inviting}>{inviting ? 'Sending invite...' : 'Send Invite'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {modal === 'edit' && target && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-start justify-center overflow-y-auto p-12" onClick={() => setModal('none')}>
          <div className="bg-layer w-full max-w-[780px] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6 border-b border-border-subtle">
              <div>
                <p className="text-xs text-text-secondary font-semibold uppercase tracking-[0.08em]">User Management</p>
                <h2 className="text-xl font-semibold text-text-primary mt-1">Edit User</h2>
              </div>
              <button className="bg-transparent border-none cursor-pointer text-text-secondary hover:text-text-primary p-1" onClick={() => setModal('none')}><X size={20} /></button>
            </div>
            <div className="p-6">
              {editErr && <Notification kind="e" title="Error" body={editErr} />}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <FormItem label="Full name *"><input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></FormItem>
                <FormItem label="Email address *"><input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></FormItem>
              </div>
              <FormItem label="Role" helper={target.id === currentUserId ? 'You cannot change your own role.' : 'Changing role takes effect immediately.'}>
                <select className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" value={editForm.role} disabled={target.id === currentUserId} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="tech">Technician</option><option value="admin">Administrator</option><option value="client">Client</option>
                </select>
              </FormItem>
              <div className="grid grid-cols-2 gap-4">
                <FormItem label="Phone number"><input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" placeholder="+263 77 123 4567" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></FormItem>
                <FormItem label="Specialty"><input className="w-full h-9 px-3 text-sm bg-[#f9fafb] border border-border-strong outline-none focus:border-interactive transition-colors" placeholder="e.g. Split Systems, VRV" value={editForm.specialty} onChange={e => setEditForm(f => ({ ...f, specialty: e.target.value }))} /></FormItem>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border-subtle bg-surface">
              <button className={`${tb} bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors`} onClick={() => setModal('none')}>Cancel</button>
              <button className={`${tb} bg-interactive text-white border-none cursor-pointer hover:bg-interactive-hover transition-colors`} onClick={handleEdit} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Resend Modal */}
      {modal === 'resend' && target && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-start justify-center overflow-y-auto p-12" onClick={() => setModal('none')}>
          <div className="bg-layer w-full max-w-[480px] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6 border-b border-border-subtle">
              <div>
                <p className="text-xs text-text-secondary font-semibold uppercase tracking-[0.08em]">User Management</p>
                <h2 className="text-xl font-semibold text-text-primary mt-1">Resend Credentials</h2>
              </div>
              <button className="bg-transparent border-none cursor-pointer text-text-secondary hover:text-text-primary p-1" onClick={() => setModal('none')}><X size={20} /></button>
            </div>
            <div className="p-6">
              {resendErr && <Notification kind="e" title="Error" body={resendErr} />}
              <div className="flex items-center gap-4 p-4 mb-4 bg-surface-hover border border-border-subtle">
                <Avatar name={target.name} size={40} color={target.role === 'admin' ? '#6929c4' : '#0f62fe'} />
                <div>
                  <p className="font-semibold text-text-primary">{target.name}</p>
                  <p className="text-xs text-text-secondary">{target.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-amber-50 border-l-4 border-l-support-warning">
                <div>
                  <div className="font-semibold text-sm text-text-primary">A new temporary password will be generated</div>
                  <div className="text-sm text-text-secondary">The user&apos;s current password will be replaced and they will receive new login credentials at <strong>{target.email}</strong>.</div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border-subtle bg-surface">
              <button className={`${tb} bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors`} onClick={() => setModal('none')}>Cancel</button>
              <button className={`${tb} bg-interactive text-white border-none cursor-pointer hover:bg-interactive-hover transition-colors gap-1.5`} onClick={handleResend} disabled={resending}>
                <Mail size={16} />{resending ? 'Sending...' : 'Send New Credentials'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal === 'delete' && target && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-start justify-center overflow-y-auto p-12" onClick={() => setModal('none')}>
          <div className="bg-layer w-full max-w-[480px] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6 border-b border-border-subtle">
              <div>
                <p className="text-xs text-text-secondary font-semibold uppercase tracking-[0.08em]">User Management</p>
                <h2 className="text-xl font-semibold text-text-primary mt-1">Remove User</h2>
              </div>
              <button className="bg-transparent border-none cursor-pointer text-text-secondary hover:text-text-primary p-1" onClick={() => setModal('none')}><X size={20} /></button>
            </div>
            <div className="p-6">
              <Notification kind="e" title={`Remove ${target.name}?`} body="This will permanently delete their account. Jobs they are assigned to will remain but their user record will be removed." />
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border-subtle bg-surface">
              <button className={`${tb} bg-surface border border-border-strong text-text-primary cursor-pointer hover:bg-surface-hover transition-colors`} onClick={() => setModal('none')}>Cancel</button>
              <button className={`${tb} bg-support-error text-white border-none cursor-pointer hover:opacity-90 transition-opacity`} onClick={handleDelete} disabled={deleting}>{deleting ? 'Removing...' : 'Remove User'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
