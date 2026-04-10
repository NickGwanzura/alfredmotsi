'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, FormItem, Notification } from './ui';
import { sendUserInviteEmail } from '@/app/lib/email/client';
import { Close, Add } from '@carbon/icons-react';

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
  admin: { bg: '#491d8b22', txt: '#491d8b', label: 'Administrator' },
  tech:  { bg: '#0043ce22', txt: '#0043ce', label: 'Technician' },
  client:{ bg: '#005d5d22', txt: '#005d5d', label: 'Client' },
};

function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$!';
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const base = [pick(upper), pick(upper), pick(lower), pick(lower), pick(digits), pick(digits), pick(special)];
  for (let i = 0; i < 3; i++) {
    const all = upper + lower + digits;
    base.push(pick(all));
  }
  return base.sort(() => Math.random() - 0.5).join('');
}

export default function UserManagement({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [editTarget, setEditTarget] = useState<ManagedUser | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Invite form
  const [form, setForm] = useState({ name: '', email: '', role: 'tech', phone: '', specialty: '' });
  const [tempPw, setTempPw] = useState('');
  const [formErr, setFormErr] = useState('');
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Edit role state
  const [editRole, setEditRole] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setErr('Could not load users. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  function openInvite() {
    setForm({ name: '', email: '', role: 'tech', phone: '', specialty: '' });
    setTempPw(generateTempPassword());
    setFormErr('');
    setCopied(false);
    setShowInvite(true);
  }

  async function handleInvite() {
    if (!form.name.trim() || !form.email.trim()) {
      setFormErr('Name and email are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setFormErr('Enter a valid email address.');
      return;
    }
    setInviting(true);
    setFormErr('');

    try {
      // 1. Create user in DB
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tempPassword: tempPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormErr(data.error || 'Failed to create user.');
        return;
      }

      // 2. Send invite email
      // Add ?logout=1 to force clear any existing session
      await sendUserInviteEmail({
        to: form.email,
        userName: form.name,
        tempPassword: tempPw,
        role: form.role,
        loginUrl: `${window.location.origin}/?logout=1`,
      });

      setShowInvite(false);
      setSuccessMsg(`${form.name} has been invited. Credentials sent to ${form.email}.`);
      setTimeout(() => setSuccessMsg(''), 6000);
      await loadUsers();
    } catch {
      setFormErr('An error occurred. Please try again.');
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange() {
    if (!editTarget || !editRole) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || 'Failed to update role');
        return;
      }
      setUsers(prev => prev.map(u => u.id === editTarget.id ? { ...u, role: editRole as ManagedUser['role'] } : u));
      setEditTarget(null);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      const d = await res.json();
      alert(d.error || 'Failed to delete user');
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
      {/* Page Header */}
      <div className="page-hdr" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>User Management</h1>
          <p>Invite staff, manage roles, and control access to the platform.</p>
        </div>
        <button 
          className="btn btn-p" 
          onClick={openInvite}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Add size={16} />
          Invite User
        </button>
      </div>

      {/* Success notification */}
      {successMsg && <Notification kind="s" title="User invited" body={successMsg} />}
      {err && <Notification kind="e" title="Error" body={err} />}

      {/* Stats row */}
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
              <th style={{ width: 120 }}>Actions</th>
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
              return (
                <tr key={u.id}>
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
                    <div style={{ display: 'flex', gap: 0 }}>
                      <button
                        className="btn btn-g btn-sm"
                        onClick={() => { setEditTarget(u); setEditRole(u.role); }}
                        title="Change role"
                      >
                        Edit
                      </button>
                      {!isSelf && (
                        <button
                          className="btn btn-d btn-sm"
                          style={{ marginLeft: 1 }}
                          onClick={() => setDeleteTarget(u)}
                          title="Remove user"
                        >
                          Remove
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
      {showInvite && (
        <div className="overlay" onClick={() => setShowInvite(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <div>
                <div className="modal-lbl">User Management</div>
                <div className="modal-title">Invite Team Member</div>
              </div>
              <button 
                className="x-btn" 
                onClick={() => setShowInvite(false)}
                aria-label="Close"
                title="Close"
              >
                <Close size={20} />
              </button>
            </div>

            <div className="modal-body">
              {formErr && <Notification kind="e" title="Check form" body={formErr} />}

              <div className="g2">
                <FormItem label="Full name *">
                  <input
                    className="inp"
                    placeholder="e.g. Tendai Moyo"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </FormItem>
                <FormItem label="Email address *">
                  <input
                    className="inp"
                    type="email"
                    placeholder="e.g. tendai@splashaircrmzw.site"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </FormItem>
              </div>

              <FormItem label="Role *" helper="Administrators have full access. Technicians can only view their assigned jobs.">
                <select
                  className="sel"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="tech">Technician</option>
                  <option value="admin">Administrator</option>
                </select>
              </FormItem>

              <div className="g2">
                <FormItem label="Phone number">
                  <input
                    className="inp"
                    placeholder="e.g. +263 77 123 4567"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </FormItem>
                <FormItem label="Specialty" helper="e.g. VRV/VRF, Refrigeration">
                  <input
                    className="inp"
                    placeholder="e.g. Split Systems, Ducted"
                    value={form.specialty}
                    onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                  />
                </FormItem>
              </div>

              <div className="div" />

              <FormItem label="Temporary password" helper="Generated automatically. Share this securely with the user — they should change it after first login.">
                <div style={{ display: 'flex', gap: 0 }}>
                  <input
                    className="inp mono"
                    value={tempPw}
                    readOnly
                    style={{ flex: 1, background: 'var(--l2)', letterSpacing: '.08em' }}
                  />
                  <button
                    className={`btn btn-sm ${copied ? 'btn-ok' : 'btn-g'}`}
                    style={{ borderLeft: '1px solid var(--bs2)', flexShrink: 0 }}
                    onClick={copyPassword}
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                  <button
                    className="btn btn-g btn-sm"
                    style={{ borderLeft: '1px solid var(--bs2)', flexShrink: 0 }}
                    onClick={() => { setTempPw(generateTempPassword()); setCopied(false); }}
                  >
                    Regenerate
                  </button>
                </div>
              </FormItem>

              <div className="notif notif-i" style={{ marginTop: 'var(--s4)' }}>
                <div>
                  <div className="notif-title">Invite email will be sent</div>
                  <div className="notif-body">
                    {form.email || 'The user'} will receive their login credentials via email. The password above is a one-time temporary password.
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn btn-g" onClick={() => setShowInvite(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleInvite} disabled={inviting}>
                {inviting ? 'Sending invite...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Role Modal ── */}
      {editTarget && (
        <div className="overlay" onClick={() => setEditTarget(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <div>
                <div className="modal-lbl">User Management</div>
                <div className="modal-title">Edit User</div>
              </div>
              <button 
                className="x-btn" 
                onClick={() => setEditTarget(null)}
                aria-label="Close"
                title="Close"
              >
                <Close size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s4)', marginBottom: 'var(--s6)', padding: 'var(--s4)', background: 'var(--l2)', border: '1px solid var(--bs1)' }}>
                <Avatar
                  name={editTarget.name}
                  size={40}
                  color={editTarget.role === 'admin' ? '#6929c4' : '#0f62fe'}
                />
                <div>
                  <p style={{ fontWeight: 600 }}>{editTarget.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--ts)' }}>{editTarget.email}</p>
                </div>
              </div>

              <FormItem label="Role" helper="Changing role takes effect immediately.">
                <select
                  className="sel"
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                  disabled={editTarget.id === currentUserId}
                >
                  <option value="tech">Technician</option>
                  <option value="admin">Administrator</option>
                  <option value="client">Client</option>
                </select>
              </FormItem>

              {editTarget.id === currentUserId && (
                <Notification kind="w" title="Cannot change your own role" body="Ask another administrator to change your role." />
              )}
            </div>

            <div className="modal-foot">
              <button className="btn btn-g" onClick={() => setEditTarget(null)}>Cancel</button>
              <button
                className="btn btn-p"
                onClick={handleRoleChange}
                disabled={editLoading || editTarget.id === currentUserId || editRole === editTarget.role}
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <div>
                <div className="modal-lbl">User Management</div>
                <div className="modal-title">Remove User</div>
              </div>
              <button 
                className="x-btn" 
                onClick={() => setDeleteTarget(null)}
                aria-label="Close"
                title="Close"
              >
                <Close size={20} />
              </button>
            </div>

            <div className="modal-body">
              <Notification
                kind="e"
                title={`Remove ${deleteTarget.name}?`}
                body="This will permanently delete their account. Any jobs they are assigned to will remain but their user record will be removed."
              />
            </div>

            <div className="modal-foot">
              <button className="btn btn-g" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-d" onClick={handleDelete}>Remove User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
