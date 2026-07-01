import { ChevronLeft, ChevronRight, Clock, KeyRound, Upload, UserCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api.js';
import { Field } from '../shared/Field.jsx';
import { Panel } from '../shared/Panel.jsx';
import { Placeholder } from '../shared/index.jsx';
import { ChangeEmailForm } from './ChangeEmailForm.jsx';
import { ChangePasswordForm } from './ChangePasswordForm.jsx';

// ── Time helpers ───────────────────────────────────────────────────────────────
function formatDateTime(raw) {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d)) return String(raw);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function timeAgo(raw) {
  if (!raw) return '';
  const diff = Math.floor((Date.now() - new Date(raw)) / 1000); // seconds
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return formatDateTime(raw);
}

// ── Profile Page ───────────────────────────────────────────────────────────────
export function Profile({ setNotice }) {
  const [profile, setProfile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({});
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [emailOtp, setEmailOtp] = useState(null);
  const fileRef = useRef();

  // Audit log state
  const [actionFilter, setActionFilter] = useState('');
  const [logPage, setLogPage] = useState(1);
  const LOG_PAGE_SIZE = 5;

  const load = async () => {
    const [profileData, auditData] = await Promise.all([api.profile(), api.auditLogs()]);
    setProfile(profileData);
    setLogs(Array.isArray(auditData) ? auditData : []);
    setForm({
      fullName: profileData.displayName ?? '',
      mobileNumber: profileData.mobileNumber ?? '',
      designation: profileData.designation ?? '',
      organization: profileData.organization ?? '',
      profileImagePath: profileData.profileImagePath ?? ''
    });
    setPreviewUrl(profileData.profileImagePath ?? null);
  };

  useEffect(() => { load().catch((err) => setNotice(err.message)); }, []);

  const save = async () => {
    try {
      const updated = await api.updateProfile(form);
      setProfile(updated);
      setNotice('Profile updated.');
      await load();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const data = await api.uploadProfileImage(file);
      setForm((f) => ({ ...f, profileImagePath: data.profileImagePath }));
      setNotice('Profile image uploaded.');
    } catch (err) {
      setNotice(err.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Audit log derived state ──────────────────────────────────────────────────
  const actionTypes = useMemo(() => {
    const set = new Set(logs.map((l) => l.action).filter(Boolean));
    return [...set].sort();
  }, [logs]);

  const filteredLogs = useMemo(
    () => logs.filter((l) => !actionFilter || l.action === actionFilter),
    [logs, actionFilter]
  );

  const totalLogPages = Math.ceil(filteredLogs.length / LOG_PAGE_SIZE) || 1;
  const pagedLogs = filteredLogs.slice(
    (logPage - 1) * LOG_PAGE_SIZE,
    logPage * LOG_PAGE_SIZE
  );

  // Reset page when filter changes
  useEffect(() => { setLogPage(1); }, [actionFilter]);

  // Most-recent entry (unfiltered)
  const lastEntry = logs.length > 0
    ? logs.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b)
    : null;

  if (!profile) return <Placeholder title="Profile" lines={['Loading account information…']} />;

  return (
    <section className="split">
      {/* ── Account Information ─────────────────────────────────────────── */}
      <Panel title="Account Information">
        <div className="profile-image-section">
          <div className="profile-avatar" onClick={() => fileRef.current.click()} title="Click to change photo">
            {previewUrl
              ? <img src={previewUrl} alt="Profile" />
              : <UserCircle size={64} strokeWidth={1.2} />}
            <div className="avatar-overlay">
              <Upload size={18} /> {uploading ? 'Uploading…' : 'Change Photo'}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>

        <div className="profile-form">
          <Field label="Full Name" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
          <Field label="Mobile Number" value={form.mobileNumber} onChange={(v) => setForm({ ...form, mobileNumber: v })} />
          <Field label="Designation" value={form.designation} onChange={(v) => setForm({ ...form, designation: v })} />
          <Field label="Organization" value={form.organization} onChange={(v) => setForm({ ...form, organization: v })} />
          <button className="primary-action" onClick={save}>Save Profile</button>
        </div>

        <div className="account-meta">
          <p><strong>Username:</strong> {profile.username}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Role:</strong> {profile.role}</p>
          <p><strong>Status:</strong> {profile.status}</p>
          <p><strong>Created:</strong> {formatDateTime(profile.createdAt)}</p>
          <p><strong>Last Login:</strong> {formatDateTime(profile.lastLogin)}</p>
        </div>

        <div className="profile-actions">
          <button className="secondary-action" onClick={() => setShowChangePassword(!showChangePassword)}>
            <KeyRound size={15} /> Change Password
          </button>
          <button className="secondary-action" onClick={() => setShowChangeEmail(!showChangeEmail)}>
            Change Email
          </button>
        </div>

        {showChangePassword && (
          <ChangePasswordForm setNotice={setNotice} onClose={() => setShowChangePassword(false)} />
        )}
        {showChangeEmail && (
          <ChangeEmailForm
            setNotice={setNotice}
            onClose={() => setShowChangeEmail(false)}
            emailOtp={emailOtp}
            setEmailOtp={setEmailOtp}
          />
        )}
      </Panel>

      {/* ── Activity / Audit Logs ─────────────────────────────────────────── */}
      <Panel title="Activity Logs">

        {/* Last Activity banner */}
        {lastEntry && (
          <div className="audit-last-activity">
            <Clock size={15} />
            <div className="audit-last-activity-body">
              <span className="audit-last-label">Last Activity</span>
              <span className="audit-last-action">{lastEntry.action}</span>
              <span className="audit-last-time">
                {formatDateTime(lastEntry.createdAt)}
                <span className="audit-last-ago">{timeAgo(lastEntry.createdAt)}</span>
              </span>
            </div>
          </div>
        )}

        {/* Filter toolbar */}
        <div className="audit-toolbar">
          <select
            className="um-filter-select"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            {actionTypes.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <span className="um-count">
            {filteredLogs.length} event{filteredLogs.length !== 1 ? 's' : ''}
          </span>
          {actionFilter && (
            <button className="um-clear-btn" onClick={() => setActionFilter('')}>Clear</button>
          )}
        </div>

        {/* Table */}
        <div className="um-table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Action</th>
                <th>Details</th>
                <th>Date &amp; Time</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {pagedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#8a9bb0', padding: '32px' }}>
                    No activity logs found
                  </td>
                </tr>
              ) : pagedLogs.map((log, idx) => (
                <tr key={log.id ?? idx}>
                  <td style={{ color: '#8a9bb0', width: 32 }}>
                    {(logPage - 1) * LOG_PAGE_SIZE + idx + 1}
                  </td>
                  <td>
                    <span className="status">{log.action}</span>
                  </td>
                  <td style={{ maxWidth: 180, wordBreak: 'break-word' }}>
                    {log.details || '—'}
                  </td>
                  <td className="audit-datetime">{formatDateTime(log.createdAt)}</td>
                  <td className="audit-ago">{timeAgo(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalLogPages > 1 && (
          <div className="um-pagination">
            <button
              onClick={() => setLogPage((p) => Math.max(1, p - 1))}
              disabled={logPage === 1}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span>Page {logPage} of {totalLogPages}</span>
            <button
              onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
              disabled={logPage === totalLogPages}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </Panel>
    </section>
  );
}
