import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiClipboard, FiSearch, FiFilter } from 'react-icons/fi';
import { format } from 'date-fns';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/api/admin/audit-logs')
      .then(r => setLogs(r.data.data || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.resource?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header"><h1>Audit Logs</h1><p>System activity tracking</p></div>

      <div className="search-box mb-4"><FiSearch /><input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} /></div>

      <div className="table-container card">
        <table>
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Resource</th><th>IP</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan="5" className="text-center" style={{padding:'30px',color:'var(--gray-500)'}}>No logs</td></tr> :
              filtered.slice(0, 100).map(log => (
                <tr key={log._id}>
                  <td style={{fontSize:'12px',whiteSpace:'nowrap'}}>{format(new Date(log.createdAt), 'MMM d, h:mm a')}</td>
                  <td><strong>{log.user?.name || 'System'}</strong><br/><span style={{fontSize:'11px'}} className="badge badge-gray">{log.user?.role}</span></td>
                  <td>{log.action}</td>
                  <td><span className="badge badge-info">{log.resource}</span></td>
                  <td style={{fontSize:'12px',color:'var(--gray-500)'}}>{log.ipAddress || '--'}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogs;
