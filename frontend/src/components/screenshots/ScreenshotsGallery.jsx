import { useState, useEffect, useMemo } from 'react';
import { api } from '../../api.js';
import { Panel, DataTable } from '../shared/index.jsx';
import { Search, Eye, X, Image as ImageIcon, RefreshCw, LayoutGrid, List } from 'lucide-react';

export function ScreenshotsGallery({ onSelectExecution }) {
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchExecutionCode, setSearchExecutionCode] = useState('');
  const [activeImage, setActiveImage] = useState(null);

  const fetchScreenshots = async () => {
    setLoading(true);
    try {
      const list = await api.screenshotsList();
      setScreenshots(list);
    } catch (e) {
      console.error("Error loading screenshots", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenshots();
  }, []);

  const [viewMode, setViewMode] = useState('gallery');

  const filteredScreenshots = useMemo(() => {
    return screenshots.filter(s => {
      if (!searchExecutionCode) return true;
      return (s.executionCode || '').toLowerCase().includes(searchExecutionCode.toLowerCase());
    });
  }, [screenshots, searchExecutionCode]);

  const columns = useMemo(() => [
    {
      key: 'screenshotPath',
      label: 'Image',
      render: (val, shot) => (
        <img 
          src={`/uploads/${val}`} 
          alt={shot.methodName} 
          style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
          onClick={() => setActiveImage(shot)}
        />
      )
    },
    {
      key: 'executionCode',
      label: 'Execution',
      render: (val, shot) => (
        <button 
          onClick={() => onSelectExecution(shot.executionId)}
          style={{ border: 0, background: 'transparent', padding: 0, color: '#176b87', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {val}
        </button>
      )
    },
    {
      key: 'moduleCode',
      label: 'Module',
      render: (val) => <span className="status failed">{val}</span>
    },
    {
      key: 'testName',
      label: 'Test Name'
    },
    {
      key: 'methodName',
      label: 'Method'
    },
    {
      key: 'failureReason',
      label: 'Failure Reason',
      render: (val) => (
        <div style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={val}>
          {val}
        </div>
      )
    }
  ], [onSelectExecution]);

  return (
    <section className="screenshots-gallery-page" style={{ display: 'grid', gap: '20px' }}>
      
      {/* Filters */}
      <Panel title="Filter Screenshots">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', border: '1px solid #cfdae6', borderRadius: '8px', overflow: 'hidden', background: '#fff', alignItems: 'center', padding: '0 12px' }}>
            <Search size={16} style={{ color: '#8a9bb0' }} />
            <input 
              type="text" 
              placeholder="Search by execution code (e.g. AUTO-...)" 
              value={searchExecutionCode}
              onChange={(e) => setSearchExecutionCode(e.target.value)}
              style={{ width: '100%', height: '38px', border: 0, outline: 0, paddingLeft: '8px', fontSize: '13px' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '8px', border: '1px solid #cfdae6' }}>
            <button
              onClick={() => setViewMode('gallery')}
              style={{ padding: '6px 10px', border: 0, cursor: 'pointer', borderRadius: '6px', background: viewMode === 'gallery' ? '#fff' : 'transparent', color: viewMode === 'gallery' ? '#0f172a' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Gallery View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{ padding: '6px 10px', border: 0, cursor: 'pointer', borderRadius: '6px', background: viewMode === 'table' ? '#fff' : 'transparent', color: viewMode === 'table' ? '#0f172a' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Table View"
            >
              <List size={15} />
            </button>
          </div>

          <button 
            onClick={fetchScreenshots} 
            className="secondary-action"
            style={{ height: '40px', display: 'flex', gap: '6px', alignItems: 'center' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </Panel>

      {/* Grid / Table content */}
      <Panel title={viewMode === 'gallery' ? "Failure Screenshots Gallery" : "Failure Screenshots List"}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <RefreshCw className="animate-spin" style={{ color: '#176b87' }} />
            <p style={{ marginTop: '10px' }}>Loading screenshots...</p>
          </div>
        ) : filteredScreenshots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8a9bb0' }}>
            <ImageIcon size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.5 }} />
            <p>No failure screenshots found.</p>
          </div>
        ) : viewMode === 'gallery' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
            {filteredScreenshots.map((shot) => (
              <div 
                key={shot.testCaseId} 
                style={{ 
                  border: '1px solid #e2eaf3', 
                  borderRadius: '10px', 
                  overflow: 'hidden', 
                  background: '#fff', 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'transform 0.15s',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ position: 'relative', height: '160px', background: '#f5f8fb', overflow: 'hidden' }}>
                  <img 
                    src={`/uploads/${shot.screenshotPath}`} 
                    alt={shot.methodName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => setActiveImage(shot)}
                  />
                  <span 
                    className="status failed"
                    style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '10px', minHeight: 'unset', padding: '2px 8px' }}
                  >
                    {shot.moduleCode}
                  </span>
                </div>
                
                <div style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '14px', color: '#2c3e50', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                      {shot.methodName}
                    </strong>
                    <button 
                      onClick={() => onSelectExecution(shot.executionId)}
                      style={{ border: 0, background: 'transparent', padding: 0, color: '#176b87', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {shot.executionCode}
                    </button>
                  </div>
                  <span style={{ fontSize: '11px', color: '#8a9bb0', display: 'block', marginBottom: '8px' }}>
                    {shot.testName}
                  </span>
                  <p 
                    style={{ 
                      fontSize: '12px', 
                      color: '#c0392b', 
                      margin: 0, 
                      background: '#fff3f3', 
                      padding: '8px 10px', 
                      borderRadius: '6px', 
                      maxHeight: '52px', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}
                    title={shot.failureReason}
                  >
                    {shot.failureReason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={filteredScreenshots} 
            searchPlaceholder="Filter screenshots..."
            exportFilename="failure_screenshots.csv"
          />
        )}
      </Panel>

      {/* Lightbox Modal */}
      {activeImage && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(15,25,35,0.9)', 
            zIndex: 2000, 
            display: 'grid', 
            placeItems: 'center', 
            padding: '24px' 
          }}
          onClick={() => setActiveImage(null)}
        >
          <div 
            style={{ 
              position: 'relative', 
              maxWidth: '90%', 
              maxHeight: '90%', 
              background: '#fff', 
              borderRadius: '8px', 
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={`/uploads/${activeImage.screenshotPath}`} 
              alt={activeImage.methodName}
              style={{ maxWidth: '100%', maxHeight: '75vh', display: 'block', objectFit: 'contain' }}
            />
            <button 
              onClick={() => setActiveImage(null)} 
              style={{ position: 'absolute', top: '10px', right: '10px', border: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}
            >
              <X size={20} />
            </button>
            <div style={{ padding: '16px 20px', borderTop: '1px solid #edf2f7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <strong style={{ fontSize: '15px' }}>{activeImage.methodName}</strong>
                <button 
                  onClick={() => {
                    setActiveImage(null);
                    onSelectExecution(activeImage.executionId);
                  }}
                  style={{ border: 0, background: 'transparent', padding: 0, color: '#176b87', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Go to Execution {activeImage.executionCode}
                </button>
              </div>
              <p style={{ margin: 0, color: '#c0392b', fontSize: '13px', fontWeight: 600 }}>{activeImage.failureReason}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
