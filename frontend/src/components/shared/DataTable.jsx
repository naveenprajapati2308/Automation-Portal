import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Download,
  Settings,
  Search,
  FolderOpen
} from 'lucide-react';
import './datatable-theme.css';

export function DataTable({
  columns,
  data = [],
  loading = false,
  searchPlaceholder = "Search...",
  exportFilename = "export.csv",
  emptyMessage = "No records found.",
  emptyHint = ""
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'none' });
  const [visibleColumns, setVisibleColumns] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );
  const [showColumnToggle, setShowColumnToggle] = useState(false);

  // 1. Column visibility toggle
  const toggleColumn = (key) => {
    setVisibleColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 2. Global Search
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const lowerQuery = searchQuery.toLowerCase();
    return data.filter(row => {
      return columns.some(col => {
        if (!visibleColumns[col.key]) return false;
        const val = row[col.key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(lowerQuery);
      });
    });
  }, [data, searchQuery, columns, visibleColumns]);

  // 3. Sorting
  const sortedData = useMemo(() => {
    if (sortConfig.key === null || sortConfig.direction === 'none') {
      return filteredData;
    }

    return [...filteredData].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // 4. Pagination calculations
  const totalRecords = sortedData.length;
  const totalPages = Math.ceil(totalRecords / pageSize);

  // Adjust page if search changes total count
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));

  const paginatedData = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedData.slice(startIdx, startIdx + pageSize);
  }, [sortedData, safeCurrentPage, pageSize]);

  // Reset page when search query changes
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Sort click handler
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'none';
    }
    setSortConfig({ key, direction });
  };

  // CSV Export
  const exportToCSV = () => {
    const activeCols = columns.filter(col => visibleColumns[col.key]);

    // Headers
    const headers = activeCols.map(col => `"${col.label.replace(/"/g, '""')}"`).join(',');

    // Rows
    const rows = sortedData.map(row => {
      return activeCols.map(col => {
        let val = row[col.key];
        if (val === null || val === undefined) val = '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", exportFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Page index range display
  const startRecord = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, totalRecords);

  return (
    <div className="datatable-container">
      {/* Action Bar */}
      <div className="datatable-actions">
        {/* Search */}
        <div className="datatable-search-wrapper">
          <Search size={16} className="datatable-search-icon" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={handleSearchChange}
            className="datatable-search-input"
          />
        </div>

        {/* Toolbar buttons */}
        <div className="datatable-toolbar">
          {/* Column selector toggler */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowColumnToggle(!showColumnToggle)}
              className="btn btn-secondary btn-icon"
              title="Column Visibility"
            >
              <Settings size={16} />
              <span>Columns</span>
            </button>
            {showColumnToggle && (
              <div className="datatable-column-toggle-popup">
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>Toggle Columns</h4>
                {columns.map(col => (
                  <label key={col.key} className="datatable-column-toggle-label">
                    <input
                      type="checkbox"
                      checked={visibleColumns[col.key]}
                      onChange={() => toggleColumn(col.key)}
                      style={{ marginRight: '6px' }}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* CSV Export */}
          <button
            onClick={exportToCSV}
            className="btn btn-secondary btn-icon"
            title="Export CSV"
            disabled={totalRecords === 0}
          >
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Table grid wrapper */}
      <div className="datatable-table-wrapper">
        <table className="datatable-table">
          <thead>
            <tr>
              {columns.map(col => {
                if (!visibleColumns[col.key]) return null;
                const isSorted = sortConfig.key === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => requestSort(col.key)}
                    style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {col.label}
                      {isSorted ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      ) : (
                        <ArrowUpDown size={14} style={{ opacity: 0.3 }} />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Loading Skeleton loader rows
              Array.from({ length: pageSize }).map((_, rIdx) => (
                <tr key={rIdx}>
                  {columns.map(col => {
                    if (!visibleColumns[col.key]) return null;
                    return (
                      <td key={col.key}>
                        <div className="skeleton skeleton-text"></div>
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.filter(c => visibleColumns[c.key]).length} style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div className="datatable-empty-state">
                    <FolderOpen size={42} className="datatable-empty-icon" />
                    {emptyMessage}
                    {emptyHint && <span style={{ fontSize: '12px', opacity: 0.75 }}>{emptyHint}</span>}
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              paginatedData.map((row, rowIdx) => (
                <tr key={row.id || rowIdx}>
                  {columns.map(col => {
                    if (!visibleColumns[col.key]) return null;
                    const value = row[col.key];
                    return (
                      <td key={col.key}>
                        {col.render ? col.render(value, row) : (value ?? '-')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="datatable-footer">
        <div className="datatable-showing-label">
          Showing {startRecord} to {endRecord} of {totalRecords} records
        </div>

        <div className="datatable-pagination-controls">
          {/* Page size drop-down */}
          <div className="datatable-pagesize-select-wrapper">
            <span style={{ fontSize: '12px', color: '#666' }}>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="datatable-pagesize-select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Nav buttons */}
          <div className="datatable-page-buttons">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className="btn btn-secondary btn-icon-only"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="btn btn-secondary btn-icon-only"
            >
              <ChevronLeft size={16} />
            </button>

            <span style={{ fontSize: '13px', fontWeight: 600, padding: '0 8px' }}>
              Page {safeCurrentPage} of {totalPages || 1}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages || totalPages === 0}
              className="btn btn-secondary btn-icon-only"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages || totalPages === 0}
              className="btn btn-secondary btn-icon-only"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
