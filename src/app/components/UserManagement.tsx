'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, FormItem, Notification } from './ui';
import { useToast } from './Toast';
import { X, Plus, Mail, Trash2, FileEdit, AlertTriangle, Users, Shield, Wrench } from 'lucide-react';

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

const ROLE_AVATAR_COLORS: Record<string, string> = {
  admin: '#6929c4',
  tech: '#0f62fe',
  client: '#005d5d',
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
  const { success: showToast } = useToast();
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
      setModal('none'); showToast('User invited', `${inviteForm.name} — credentials sent to ${inviteForm.email}`);
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
      setModal('none'); showToast('User updated', `${editForm.name} saved successfully.`);
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
      setModal('none'); showToast('Credentials sent', `New login details sent to ${target.email}.`);
    } catch { setResendErr('An error occurred. Please try again.'); }
    finally { setResending(false); }
  }

  function openDelete(u: ManagedUser) { setTarget(u); setModal('delete'); }

  async function handleDelete() {
    if (!target) return; setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${target.id}`, { method: 'DELETE' });
      if (res.ok) { setUsers(prev => prev.filter(u => u.id !== target.id)); setModal('none'); showToast('User removed', `${target.name} deleted.`); }
      else { const d = await res.json(); alert(d.error || 'Failed to delete user'); }
    } finally { setDeleting(false); }
  }

  async function handleCleanDuplicates() {
    setDeduping(true);
    try {
      const res = await fetch('/api/admin/users/cleanup-duplicates', { method: 'POST' });
      const data = await res.json();
      if (res.ok) { showToast('Duplicates cleaned', data.removed > 0 ? `${data.removed} duplicate account${data.removed > 1 ? 's' : ''} removed.` : 'No duplicates found.'); await loadUsers(); }
      else { alert(data.error || 'Failed to clean duplicates'); }
    } finally { setDeduping(false); }
  }

  function copyPassword() { navigator.clipboard.writeText(tempPw).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }

  const admins = users.filter(u => u.role === 'admin').length;
  const techsCount = users.filter(u => u.role === 'tech').length;

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Invite staff, manage roles, and control access to the platform.</p>
        </div>
        <div className="flex items-center gap-3">
          {dupCount > 0 && (
            <button onClick={handleCleanDuplicates} disabled={deduping}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all cursor-pointer disabled:opacity-50">
              <AlertTriangle size={16} />{deduping ? 'Cleaning...' : `Remove ${dupCount} Duplicate${dupCount > 1 ? 's' : ''}`}
            </button>
          )}
          <button onClick={openInvite}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer">
            <Plus size={16} /> Invite User
          </button>
        </div>
      </div>

      {pageErr && (
        <div className="flex items-start gap-3 p-4 mb-6 rounded-lg bg-red-50 border border-red-200">
          <div className="p-1 rounded-full bg-red-100 text-red-600"><AlertTriangle size={16} /></div>
          <div>
            <p className="font-semibold text-sm text-red-800">Error</p>
            <p className="text-sm text-red-600">{pageErr}</p>
          </div>
        </div>
      )}

      {dupCount > 0 && (
        <div className="flex items-start gap-4 p-4 mb-6 rounded-lg bg-amber-50 border border-amber-200">
          <div className="p-1.5 rounded-full bg-amber-100 text-amber-600 shrink-0"><AlertTriangle size={18} /></div>
          <div>
            <p className="font-semibold text-sm text-amber-800">{dupCount} duplicate account{dupCount > 1 ? 's' : ''} detected</p>
            <p className="text-sm text-amber-600 mt-0.5">Multiple accounts share the same email. Click "Remove Duplicates" to keep the oldest account per email and delete the rest.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'from-blue-500 to-blue-600' },
          { label: 'Administrators', value: admins, icon: Shield, color: 'from-purple-500 to-purple-600' },
          { label: 'Technicians', value: techsCount, icon: Wrench, color: 'from-amber-500 to-amber-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">{s.label}</span>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${s.color} text-white shadow-sm`}><s.icon size={18} /></div>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3">User</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3">Email</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3">Role</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3">Phone</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3">Specialty</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3">Joined</th>
              <th className="text-left text-xs uppercase tracking-wider text-gray-500 font-semibold px-4 py-3" style={{ width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center text-gray-400 py-10 text-sm">Loading users...</td></tr>}
            {!loading && users.length === 0 && (
              <tr><td colSpan={7}>
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Users size={40} className="mb-3 opacity-30" />
                  <p className="text-sm">No users found. Invite your first team member.</p>
                </div>
              </td></tr>
            )}
            {!loading && users.map(u => {
              const role = ROLE_TAG[u.role] || ROLE_TAG.tech;
              const isSelf = u.id === currentUserId;
              const isDuplicate = emailCounts[u.email.toLowerCase()] > 1;
              return (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors" style={isDuplicate ? { background: '#fef2f2' } : undefined}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size={32} color={ROLE_AVATAR_COLORS[u.role] || '#00695c'} />
                      <div>
                        <span className="font-medium text-sm text-gray-900">
                          {u.name}
                          {isSelf && <span className="text-xs text-gray-400 ml-1.5 font-normal">(you)</span>}
                        </span>
                        {isDuplicate && <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 ml-2">duplicate</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full" style={{ background: role.bg, color: role.txt }}>{role.label}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.specialty || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(u)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer" title="Edit user">
                        <FileEdit size={13} /> Edit
                      </button>
                      <button onClick={() => openResend(u)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer" title="Resend login credentials">
                        <Mail size={13} />
                      </button>
                      {!isSelf && (
                        <button onClick={() => openDelete(u)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all cursor-pointer" title="Remove user">
                          <Trash2 size={13} />
                        </button>
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 lg:p-8" onClick={() => setModal('none')}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">User Management</p>
                <h2 className="text-xl font-bold text-gray-900 mt-1">Invite Team Member</h2>
              </div>
              <button className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1 transition-colors" onClick={() => setModal('none')}><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {inviteErr && <Notification kind="e" title="Check form" body={inviteErr} />}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormItem label="Full name *">
                  <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" placeholder="e.g. Tendai Moyo" value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} />
                </FormItem>
                <FormItem label="Email address *">
                  <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" type="email" placeholder="e.g. tendai@company.com" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} />
                </FormItem>
              </div>
              <FormItem label="Role *" helper="Administrators have full access. Technicians can only view their assigned jobs.">
                <select className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="tech">Technician</option><option value="admin">Administrator</option>
                </select>
              </FormItem>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormItem label="Phone number">
                  <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" placeholder="e.g. +263 77 123 4567" value={inviteForm.phone} onChange={e => setInviteForm(f => ({ ...f, phone: e.target.value }))} />
                </FormItem>
                <FormItem label="Specialty" helper="e.g. VRV/VRF, Refrigeration">
                  <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" placeholder="e.g. Split Systems, Ducted" value={inviteForm.specialty} onChange={e => setInviteForm(f => ({ ...f, specialty: e.target.value }))} />
                </FormItem>
              </div>
              <hr className="border-gray-100" />
              <FormItem label="Temporary password" helper="Generated automatically. Will be emailed to the user.">
                <div className="flex gap-2">
                  <input className="flex-1 h-9 px-3 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none font-mono tracking-wider" value={tempPw} readOnly />
                  <button onClick={copyPassword}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer border ${
                      copied ? 'text-white bg-emerald-600 border-emerald-600' : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                  <button onClick={() => { setTempPw(generateTempPassword()); setCopied(false); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer">
                    New
                  </button>
                </div>
              </FormItem>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="p-1 rounded-full bg-blue-100 text-blue-600 shrink-0"><Mail size={14} /></div>
                <div>
                  <p className="font-semibold text-sm text-blue-800">Login credentials will be emailed</p>
                  <p className="text-sm text-blue-600 mt-0.5">{inviteForm.email || 'The user'} will receive their username and temporary password by email.</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModal('none')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer">Cancel</button>
              <button onClick={handleInvite} disabled={inviting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer disabled:opacity-50">
                {inviting ? 'Sending invite...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {modal === 'edit' && target && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 lg:p-8" onClick={() => setModal('none')}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">User Management</p>
                <h2 className="text-xl font-bold text-gray-900 mt-1">Edit User</h2>
              </div>
              <button className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1 transition-colors" onClick={() => setModal('none')}><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {editErr && <Notification kind="e" title="Error" body={editErr} />}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormItem label="Full name *">
                  <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </FormItem>
                <FormItem label="Email address *">
                  <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                </FormItem>
              </div>
              <FormItem label="Role" helper={target.id === currentUserId ? 'You cannot change your own role.' : 'Changing role takes effect immediately.'}>
                <select className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" value={editForm.role} disabled={target.id === currentUserId} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="tech">Technician</option><option value="admin">Administrator</option><option value="client">Client</option>
                </select>
              </FormItem>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormItem label="Phone number">
                  <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" placeholder="+263 77 123 4567" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                </FormItem>
                <FormItem label="Specialty">
                  <input className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none w-full" placeholder="e.g. Split Systems, VRV" value={editForm.specialty} onChange={e => setEditForm(f => ({ ...f, specialty: e.target.value }))} />
                </FormItem>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModal('none')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer">Cancel</button>
              <button onClick={handleEdit} disabled={editLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer disabled:opacity-50">
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resend Modal */}
      {modal === 'resend' && target && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 lg:p-8" onClick={() => setModal('none')}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">User Management</p>
                <h2 className="text-xl font-bold text-gray-900 mt-1">Resend Credentials</h2>
              </div>
              <button className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1 transition-colors" onClick={() => setModal('none')}><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {resendErr && <Notification kind="e" title="Error" body={resendErr} />}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
                <Avatar name={target.name} size={40} color={ROLE_AVATAR_COLORS[target.role] || '#00695c'} />
                <div>
                  <p className="font-semibold text-sm text-gray-900">{target.name}</p>
                  <p className="text-xs text-gray-500">{target.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="p-1 rounded-full bg-amber-100 text-amber-600 shrink-0"><Mail size={14} /></div>
                <div>
                  <p className="font-semibold text-sm text-amber-800">A new temporary password will be generated</p>
                  <p className="text-sm text-amber-600 mt-0.5">The user's current password will be replaced and they will receive new login credentials at <strong>{target.email}</strong>.</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModal('none')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer">Cancel</button>
              <button onClick={handleResend} disabled={resending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-700 rounded-lg shadow-sm hover:from-brand-700 hover:to-brand-800 transition-all border-none cursor-pointer disabled:opacity-50">
                <Mail size={16} />{resending ? 'Sending...' : 'Send New Credentials'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal === 'delete' && target && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 lg:p-8" onClick={() => setModal('none')}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">User Management</p>
                <h2 className="text-xl font-bold text-gray-900 mt-1">Remove User</h2>
              </div>
              <button className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1 transition-colors" onClick={() => setModal('none')}><X size={20} /></button>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="p-1 rounded-full bg-red-100 text-red-600 shrink-0"><AlertTriangle size={16} /></div>
                <div>
                  <p className="font-semibold text-sm text-red-800">Remove {target.name}?</p>
                  <p className="text-sm text-red-600 mt-0.5">This will permanently delete their account. Jobs they are assigned to will remain but their user record will be removed.</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModal('none')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all cursor-pointer disabled:opacity-50">
                {deleting ? 'Removing...' : 'Remove User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
