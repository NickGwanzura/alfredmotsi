'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, FormItem, Notification } from './ui';
import { Close, Add, Email, TrashCan, Edit, Warning } from '@carbon/icons-react';

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

  // Invite form
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'tech', phone: '', specialty: '' });
  const [tempPw, setTempPw] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteErr, setInviteErr] = useState('');

  // Edit form
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'tech', phone: '', specialty: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editErr, setEditErr] = useState('');

  // Resend
  const [resending, setResending] = useState(false);
  const [resendErr, setResendErr] = useState('');

  // Delete
  const [deleting, setDeleting] = useState(false);

  // Dedup
  const [deduping, setDeduping] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 5000);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setPageErr('');
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setPageErr('Could not load users. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Detect duplicates by email
  const emailCounts = users.reduce<Record<string, number>>((acc, u) => {
    const k = u.email.toLowerCase();
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const dupCount = Object.values(emailCounts).filter(c => c > 1).reduce((a, c) => a + c - 1, 0);

  /* ─── Invite ─── */
  function openInvite() {
    setInviteForm({ name: '', email: '', role: 'tech', phone: '', specialty: '' });
    setTempPw(generateTempPassword());
    setInviteErr('');
    setCopied(false);
    setModal('invite');
  }

  async function handleInvite() {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      setInviteErr('Name and email are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email)) {
      setInviteErr('Enter a valid email address.');
      return;
    }
    setInviting(true);
    setInviteErr('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...inviteForm, tempPassword: tempPw }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteErr(data.error || 'Failed to create user.'); return; }

      // Send invite email
      await fetch('/api/email/user-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: inviteForm.email,
          userName: inviteForm.name,
          tempPassword: tempPw,
          role: inviteForm.role,
          loginUrl: `${window.location.origin}/`,
        }),
      });

      setModal('none');
      showToast(`${inviteForm.name} invited — credentials sent to ${inviteForm.email}.`);
      await loadUsers();
    } catch {
      setInviteErr('An error occurred. Please try again.');
    } finally {
      setInviting(false);
    }
  }

  /* ─── Edit ─── */
  function openEdit(u: ManagedUser) {
    setTarget(u);
    setEditForm({ name: u.name, email: u.email, role: u.role, phone: u.phone || '', specialty: u.specialty || '' });
    setEditErr('');
    setModal('edit');
  }

  async function handleEdit() {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setEditErr('Name and email are required.');
      return;
    }
    if (!target) return;
    setEditLoading(true);
    setEditErr('');
    try {
      const res = await fetch(`/api/admin/users/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) { setEditErr(data.error || 'Failed to save changes.'); return; }
      setUsers(prev => prev.map(u => u.id === target.id ? { ...u, ...data.user } : u));
      setModal('none');
      showToast(`${editForm.name} updated successfully.`);
    } catch {
      setEditErr('An error occurred. Please try again.');
    } finally {
      setEditLoading(false);
    }
  }

  /* ─── Resend credentials ─── */
  function openResend(u: ManagedUser) {
    setTarget(u);
    setResendErr('');
    setModal('resend');
  }

  async function handleResend() {
    if (!target) return;
    setResending(true);
    setResendErr('');
    try {
      const res = await fetch('/api/admin/users/resend-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: target.id }),
      });
      const data = await res.json();
      if (!res.ok) { setResendErr(data.error || 'Failed to resend.'); return; }
      setModal('none');
      showToast(`New credentials sent to ${target.email}.`);
    } catch {
      setResendErr('An error occurred. Please try again.');
    } finally {
      setResending(false);
    }
  }

  /* ─── Delete ─── */
  function openDelete(u: ManagedUser) {
    setTarget(u);
    setModal('delete');
  }

  async function handleDelete() {
    if (!target) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${target.id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== target.id));
        setModal('none');
        showToast(`${target.name} removed.`);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete user');
      }
    } finally {
      setDeleting(false);
    }
  }

  /* ─── Clean duplicates ─── */
  async function handleCleanDuplicates() {
    setDeduping(true);
    try {
      const res = await fetch('/api/admin/users/cleanup-duplicates', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.removed > 0 ? `${data.removed} duplicate account${data.removed > 1 ? 's' : ''} removed.` : 'No duplicates found.');
        await loadUsers();
      } else {
        alert(data.error || 'Failed to clean duplicates');
      }
    } finally {
      setDeduping(false);
    }
  }

  function copyPassword() {
    navigator.clipboard.writeText(tempPw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const admins = users.filter(u => u.role === 'admin').length;
  const techs  = users.filter(u => u.role === 'tech').length;

  return (
    <div>
      {/* Fixed toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#24a148', color: '#fff', padding: '12px 20px',
          fontSize: 14, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,.18)',
          maxWidth: 380,
        }}>
          {toast}
        </div>
      )}

      {/* Page Header */}
      <div className="page-hdr" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>User Management</h1>
          <p>Invite staff, manage roles, and control access to the platform.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {dupCount > 0 && (
            <button
              className="btn btn-d"
              onClick={handleCleanDuplicates}
              disabled={deduping}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Warning size={16} />
              {deduping ? 'Cleaning...' : `Remove ${dupCount} Duplicate${dupCount > 1 ? 's' : ''}`}
            </button>
          )}
          <button
            className="btn btn-p"
            onClick={openInvite}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Add size={16} />
            Invite User
          </button>
        </div>
      </div>

      {pageErr && <Notification kind="e" title="Error" body={pageErr} />}

      {/* Duplicate warning */}
      {dupCount > 0 && (
        <div className="notif notif-w" style={{ marginBottom: 'var(--s5)' }}>
          <div>
            <div className="notif-title">{dupCount} duplicate account{dupCount > 1 ? 's' : ''} detected</div>
            <div className="notif-body">Multiple accounts share the same email. Click "Remove Duplicates" to keep the oldest account per email and delete the rest.</div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="g3" style={{ marginBottom: 'var(--s6)' }}>
        <div className="tile">
          <div className="stat-v">{users.length}</div>
          <div className="stat-l">Total Users</div>
        </div>
        <div className="tile">
          <div className="stat-v">{admins}</div>
          <div className="stat-l">Administrators</div>
        </div>
        <div className="tile">
          <div className="stat-v">{techs}</div>
          <div className="stat-l">Technicians</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Specialty</th>
              <th>Joined</th>
              <th style={{ width: 148 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ts)', padding: 'var(--s7)' }}>
                  Loading users...
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ts)', padding: 'var(--s7)' }}>
                  No users found. Invite your first team member.
                </td>
              </tr>
            )}
            {!loading && users.map(u => {
              const role = ROLE_TAG[u.role] || ROLE_TAG.tech;
              const isSelf = u.id === currentUserId;
              const isDuplicate = emailCounts[u.email.toLowerCase()] > 1;
              return (
                <tr key={u.id} style={isDuplicate ? { background: '#fff1f1' } : undefined}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
                      <Avatar
                        name={u.name}
                        size={28}
                        color={u.role === 'admin' ? '#6929c4' : u.role === 'tech' ? '#0f62fe' : '#005d5d'}
                      />
                      <span style={{ fontWeight: 500 }}>
                        {u.name}
                        {isSelf && <span style={{ fontSize: 11, color: 'var(--ts)', marginLeft: 6 }}>(you)</span>}
                        {isDuplicate && <span style={{ fontSize: 11, color: '#da1e28', marginLeft: 6 }}>duplicate</span>}
                      </span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--ts)' }}>{u.email}</td>
                  <td>
                    <span className="tag" style={{ background: role.bg, color: role.txt }}>
                      {role.label}
                    </span>
                  </td>
                  <td style={{ color: 'var(--ts)' }}>{u.phone || '—'}</td>
                  <td style={{ color: 'var(--ts)' }}>{u.specialty || '—'}</td>
                  <td style={{ color: 'var(--ts)', fontSize: 12 }}>
                    {new Date(u.createdAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button
                        className="btn btn-g btn-sm"
                        onClick={() => openEdit(u)}
                        title="Edit user"
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Edit size={14} /> Edit
                      </button>
                      <button
                        className="btn btn-s btn-sm"
                        onClick={() => openResend(u)}
                        title="Resend login credentials"
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Email size={14} />
                      </button>
                      {!isSelf && (
                        <button
                          className="btn btn-d btn-sm"
                          onClick={() => openDelete(u)}
                          title="Remove user"
                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <TrashCan size={14} />
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

      {/* ── Invite Modal ── */}
      {modal === 'invite' && (
        <div className="overlay" onClick={() => setModal('none')}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <div>
                <div className="modal-lbl">User Management</div>
                <div className="modal-title">Invite Team Member</div>
              </div>
              <button className="x-btn" onClick={() => setModal('none')} aria-label="Close"><Close size={20} /></button>
            </div>
            <div className="modal-body">
              {inviteErr && <Notification kind="e" title="Check form" body={inviteErr} />}
              <div className="g2">
                <FormItem label="Full name *">
                  <input className="inp" placeholder="e.g. Tendai Moyo" value={inviteForm.name}
                    onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} />
                </FormItem>
                <FormItem label="Email address *">
                  <input className="inp" type="email" placeholder="e.g. tendai@company.com" value={inviteForm.email}
                    onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} />
                </FormItem>
              </div>
              <FormItem label="Role *" helper="Administrators have full access. Technicians can only view their assigned jobs.">
                <select className="sel" value={inviteForm.role}
                  onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="tech">Technician</option>
                  <option value="admin">Administrator</option>
                </select>
              </FormItem>
              <div className="g2">
                <FormItem label="Phone number">
                  <input className="inp" placeholder="e.g. +263 77 123 4567" value={inviteForm.phone}
                    onChange={e => setInviteForm(f => ({ ...f, phone: e.target.value }))} />
                </FormItem>
                <FormItem label="Specialty" helper="e.g. VRV/VRF, Refrigeration">
                  <input className="inp" placeholder="e.g. Split Systems, Ducted" value={inviteForm.specialty}
                    onChange={e => setInviteForm(f => ({ ...f, specialty: e.target.value }))} />
                </FormItem>
              </div>
              <div className="div" />
              <FormItem label="Temporary password" helper="Generated automatically. Will be emailed to the user.">
                <div style={{ display: 'flex', gap: 0 }}>
                  <input className="inp mono" value={tempPw} readOnly
                    style={{ flex: 1, background: 'var(--l2)', letterSpacing: '.08em' }} />
                  <button className={`btn btn-sm ${copied ? 'btn-ok' : 'btn-g'}`}
                    style={{ borderLeft: '1px solid var(--bs2)', flexShrink: 0 }} onClick={copyPassword}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                  <button className="btn btn-g btn-sm"
                    style={{ borderLeft: '1px solid var(--bs2)', flexShrink: 0 }}
                    onClick={() => { setTempPw(generateTempPassword()); setCopied(false); }}>
                    New
                  </button>
                </div>
              </FormItem>
              <div className="notif notif-i" style={{ marginTop: 'var(--s4)' }}>
                <div>
                  <div className="notif-title">Login credentials will be emailed</div>
                  <div className="notif-body">{inviteForm.email || 'The user'} will receive their username and temporary password by email.</div>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-g" onClick={() => setModal('none')}>Cancel</button>
              <button className="btn btn-p" onClick={handleInvite} disabled={inviting}>
                {inviting ? 'Sending invite...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {modal === 'edit' && target && (
        <div className="overlay" onClick={() => setModal('none')}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <div>
                <div className="modal-lbl">User Management</div>
                <div className="modal-title">Edit User</div>
              </div>
              <button className="x-btn" onClick={() => setModal('none')} aria-label="Close"><Close size={20} /></button>
            </div>
            <div className="modal-body">
              {editErr && <Notification kind="e" title="Error" body={editErr} />}
              <div className="g2">
                <FormItem label="Full name *">
                  <input className="inp" value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </FormItem>
                <FormItem label="Email address *">
                  <input className="inp" type="email" value={editForm.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                </FormItem>
              </div>
              <FormItem label="Role" helper={target.id === currentUserId ? 'You cannot change your own role.' : 'Changing role takes effect immediately.'}>
                <select className="sel" value={editForm.role}
                  disabled={target.id === currentUserId}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="tech">Technician</option>
                  <option value="admin">Administrator</option>
                  <option value="client">Client</option>
                </select>
              </FormItem>
              <div className="g2">
                <FormItem label="Phone number">
                  <input className="inp" placeholder="+263 77 123 4567" value={editForm.phone}
                    onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                </FormItem>
                <FormItem label="Specialty">
                  <input className="inp" placeholder="e.g. Split Systems, VRV" value={editForm.specialty}
                    onChange={e => setEditForm(f => ({ ...f, specialty: e.target.value }))} />
                </FormItem>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-g" onClick={() => setModal('none')}>Cancel</button>
              <button className="btn btn-p" onClick={handleEdit} disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resend Credentials Modal ── */}
      {modal === 'resend' && target && (
        <div className="overlay" onClick={() => setModal('none')}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <div>
                <div className="modal-lbl">User Management</div>
                <div className="modal-title">Resend Credentials</div>
              </div>
              <button className="x-btn" onClick={() => setModal('none')} aria-label="Close"><Close size={20} /></button>
            </div>
            <div className="modal-body">
              {resendErr && <Notification kind="e" title="Error" body={resendErr} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s4)', marginBottom: 'var(--s5)', padding: 'var(--s4)', background: 'var(--l2)', border: '1px solid var(--bs1)' }}>
                <Avatar name={target.name} size={40} color={target.role === 'admin' ? '#6929c4' : '#0f62fe'} />
                <div>
                  <p style={{ fontWeight: 600 }}>{target.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--ts)' }}>{target.email}</p>
                </div>
              </div>
              <div className="notif notif-w">
                <div>
                  <div className="notif-title">A new temporary password will be generated</div>
                  <div className="notif-body">
                    The user&apos;s current password will be replaced and they will receive new login credentials at <strong>{target.email}</strong>.
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-g" onClick={() => setModal('none')}>Cancel</button>
              <button className="btn btn-p" onClick={handleResend} disabled={resending}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Email size={16} />
                {resending ? 'Sending...' : 'Send New Credentials'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {modal === 'delete' && target && (
        <div className="overlay" onClick={() => setModal('none')}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <div>
                <div className="modal-lbl">User Management</div>
                <div className="modal-title">Remove User</div>
              </div>
              <button className="x-btn" onClick={() => setModal('none')} aria-label="Close"><Close size={20} /></button>
            </div>
            <div className="modal-body">
              <Notification
                kind="e"
                title={`Remove ${target.name}?`}
                body="This will permanently delete their account. Jobs they are assigned to will remain but their user record will be removed."
              />
            </div>
            <div className="modal-foot">
              <button className="btn btn-g" onClick={() => setModal('none')}>Cancel</button>
              <button className="btn btn-d" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Removing...' : 'Remove User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
