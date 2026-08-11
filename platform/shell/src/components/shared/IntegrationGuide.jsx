import { BookOpen, Building2, ImageOff, ImageUp, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { MODULE_LABELS } from '../team/WorkspaceSettings.jsx';
import { Panel, Modal, ConfirmDialog } from './index.jsx';

// ── Documentation — visible to every workspace user (read-only) and to Super Admin (with
// edit/add/delete/screenshot), reached from both the regular sidebar and the Admin Workspace's
// Documentation group. Content lives in integration_guide_sections, seeded with real defaults
// (V26, rewritten in full by V27) so it's useful immediately, not an empty shell waiting for
// someone to write it. ──────────────────────────────────────────────────────────────────────────
export function IntegrationGuide({ project, superAdmin = false, setNotice }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    setLoading(true);
    api.integrationGuide()
      .then(setSections)
      .catch((e) => setNotice?.(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const saveSection = async (form) => {
    try {
      if (editSection) {
        await api.adminUpdateGuideSection(editSection.id, form);
        setNotice?.('Section updated.');
      } else {
        await api.adminCreateGuideSection(form);
        setNotice?.('Section added.');
      }
      setShowAdd(false);
      setEditSection(null);
      load();
    } catch (err) {
      setNotice?.(err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.adminDeleteGuideSection(deleteTarget.id);
      setNotice?.(`"${deleteTarget.title}" deleted.`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setNotice?.(err.message);
      setDeleteTarget(null);
    }
  };

  return (
    <section className="page-grid" style={{ gridTemplateColumns: '1fr' }}>
      <Panel title="Documentation">
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0, lineHeight: 1.6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <BookOpen size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            Everything a new workspace needs to know about Testrix and connecting an automation framework — written once,
            visible to your whole team. {superAdmin ? 'You can edit any section below, add a new one, or attach a screenshot.' : 'Only a Super Admin can edit this content.'}
          </span>
        </p>
      </Panel>

      {project && (
        <Panel title="Your Workspace">
          <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={15} style={{ color: 'var(--accent, #7c3aed)' }} />
              <strong>{project.name}</strong>
              <span style={{ color: 'var(--text-muted)' }}>{project.projectCode} · {project.workspaceCode}</span>
            </div>
            <div style={{ color: 'var(--text-secondary, #94a3b8)' }}>
              Enabled products: {(project.enabledModules || []).map((m) => MODULE_LABELS[m] || m).join(', ') || 'None yet'}
            </div>
          </div>
        </Panel>
      )}

      {sections.length > 1 && (
        <Panel title="On This Page">
          <nav className="doc-toc">
            {sections.map((s, i) => (
              <a key={s.id} href={`#doc-section-${s.id}`} className="doc-toc-link">
                <span className="doc-toc-index">{i + 1}</span> {s.title}
              </a>
            ))}
          </nav>
        </Panel>
      )}

      {superAdmin && (
        <div className="um-toolbar">
          <button className="primary-action um-create-btn" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add Section
          </button>
          <span className="um-count">{sections.length} section{sections.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {loading ? (
        <Panel title="Loading…"><p>Loading guide…</p></Panel>
      ) : sections.length === 0 ? (
        <Panel title="No content yet"><p>No guide sections have been written yet.</p></Panel>
      ) : (
        sections.map((s) => (
          <div key={s.id} id={`doc-section-${s.id}`} className="doc-section-anchor">
            <Panel title={s.title}>
              {superAdmin && (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginBottom: 10 }}>
                  <button className="action-btn edit-btn" onClick={() => setEditSection(s)} title="Edit"><Pencil size={13} /> Edit</button>
                  <button className="action-btn delete-btn" onClick={() => setDeleteTarget(s)} title="Delete"><Trash2 size={13} /> Delete</button>
                </div>
              )}
              <p style={{ whiteSpace: 'pre-line', margin: 0, lineHeight: 1.7, fontSize: 14 }}>{s.body}</p>
              {s.imagePath && (
                <img src={s.imagePath} alt={s.title} className="doc-section-image" />
              )}
            </Panel>
          </div>
        ))
      )}

      {(showAdd || editSection) && (
        <Modal
          title={editSection ? `Edit — ${editSection.title}` : 'Add Guide Section'}
          onClose={() => { setShowAdd(false); setEditSection(null); }}
          closeOnBackdrop={false}
        >
          <SectionForm
            section={editSection}
            nextOrder={sections.length + 1}
            onSave={saveSection}
            onCancel={() => { setShowAdd(false); setEditSection(null); }}
            setNotice={setNotice}
            onImageChanged={load}
          />
        </Modal>
      )}
      {deleteTarget && (
        <ConfirmDialog onClose={() => setDeleteTarget(null)}>
          <div className="confirm-icon"><Trash2 size={30} /></div>
          <h3>Delete Section?</h3>
          <p>Delete <strong>{deleteTarget.title}</strong> from Documentation? Every workspace user will stop seeing it.</p>
          <div className="confirm-actions">
            <button className="secondary-action" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="danger-action" onClick={confirmDelete}>Delete</button>
          </div>
        </ConfirmDialog>
      )}
    </section>
  );
}

function SectionForm({ section, nextOrder, onSave, onCancel, setNotice, onImageChanged }) {
  const [form, setForm] = useState({
    title: section?.title ?? '',
    body: section?.body ?? '',
    sortOrder: section?.sortOrder ?? nextOrder
  });
  const [errors, setErrors] = useState({});
  const [imagePath, setImagePath] = useState(section?.imagePath ?? null);
  const [uploading, setUploading] = useState(false);
  const update = (f, v) => { setForm((c) => ({ ...c, [f]: v })); if (errors[f]) setErrors((e) => ({ ...e, [f]: undefined })); };

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.body.trim()) errs.body = 'Body is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(form);
  };

  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !section) return;
    setUploading(true);
    try {
      const updated = await api.adminUploadGuideSectionImage(section.id, file);
      setImagePath(updated.imagePath);
      onImageChanged?.();
      setNotice?.('Screenshot uploaded.');
    } catch (err) {
      setNotice?.(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    if (!section) return;
    try {
      await api.adminRemoveGuideSectionImage(section.id);
      setImagePath(null);
      onImageChanged?.();
      setNotice?.('Screenshot removed.');
    } catch (err) {
      setNotice?.(err.message);
    }
  };

  return (
    <form onSubmit={submit} className="auth-form" noValidate>
      <div className="form-field">
        <label className="form-row">
          <span>Title <span className="required-mark">*</span></span>
          <div className="field-input-wrap">
            <input type="text" value={form.title} onChange={(e) => update('title', e.target.value)} />
          </div>
        </label>
        {errors.title && <span className="field-error">{errors.title}</span>}
      </div>
      <div className="form-field">
        <label className="form-row"><span>Body <span className="required-mark">*</span></span></label>
        <textarea
          rows={10}
          value={form.body}
          onChange={(e) => update('body', e.target.value)}
          style={{ width: '100%', border: '1px solid #cfdae6', borderRadius: 6, padding: 10, fontFamily: 'inherit', fontSize: 13, resize: 'vertical' }}
          placeholder="Plain text — line breaks are preserved as written."
        />
        {errors.body && <span className="field-error">{errors.body}</span>}
      </div>
      <div className="form-field">
        <label className="form-row">
          <span>Sort Order</span>
          <div className="field-input-wrap">
            <input type="number" value={form.sortOrder} onChange={(e) => update('sortOrder', Number(e.target.value))} />
          </div>
        </label>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Lower numbers appear first.</span>
      </div>

      <div className="form-field">
        <label className="form-row"><span>Screenshot</span></label>
        {!section ? (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Save this section first, then edit it to attach a screenshot.</span>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {imagePath && <img src={imagePath} alt="Section screenshot" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border, #1c2b40)' }} />}
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="action-btn edit-btn" style={{ cursor: 'pointer' }}>
                <ImageUp size={13} /> {uploading ? 'Uploading…' : imagePath ? 'Replace' : 'Upload'}
                <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={uploadImage} disabled={uploading} style={{ display: 'none' }} />
              </label>
              {imagePath && (
                <button type="button" className="action-btn delete-btn" onClick={removeImage}>
                  <ImageOff size={13} /> Remove
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="modal-form-actions">
        <button type="button" className="secondary-action" onClick={onCancel}>Cancel</button>
        <button className="primary-action modal-submit-btn" type="submit"><Save size={15} /> {section ? 'Save Changes' : 'Add Section'}</button>
      </div>
    </form>
  );
}
