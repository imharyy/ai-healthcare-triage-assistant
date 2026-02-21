import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FiFileText, FiDownload, FiFilter, FiPlus, FiChevronDown, FiChevronUp, FiAlertTriangle, FiZap } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const MedicalRecords = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [seedLoading, setSeedLoading] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState(null);

  const loadRecords = async (type) => {
    try {
      setLoading(true);
      const params = type && type !== 'all' ? `?type=${type}` : '';
      const { data } = await api.get(`/api/medical-records${params}`);
      setRecords(data.data || data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    loadRecords(filter);
  }, [filter]);

  const seedDummyRecords = async () => {
    setSeedLoading(true);
    try {
      const { data } = await api.post('/api/diagnostic/seed-records');
      toast.success(data.message || 'Sample records loaded!');
      loadRecords(filter);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load sample records');
    } finally {
      setSeedLoading(false);
    }
  };

  const types = ['all', 'visit', 'lab-report', 'prescription', 'imaging', 'vaccination'];

  const getTypeBadge = (type) => {
    const map = {
      'prescription': 'badge-primary',
      'lab-report': 'badge-info',
      'imaging': 'badge-warning',
      'visit': 'badge-success',
      'vaccination': 'badge-gray',
      'discharge-summary': 'badge-danger'
    };
    return map[type] || 'badge-gray';
  };

  const getTypeIcon = (type) => {
    const map = { 'prescription': '📋', 'lab-report': '🧪', 'imaging': '📷', 'visit': '🩺', 'vaccination': '💉' };
    return map[type] || '📄';
  };

  const formatBP = (bp) => {
    if (!bp) return null;
    if (typeof bp === 'string') return bp;
    if (bp.systolic && bp.diastolic) return `${bp.systolic}/${bp.diastolic}`;
    return null;
  };

  const renderLabValues = (labValues) => {
    if (!labValues || labValues.length === 0) return null;
    return (
      <div style={{marginTop:'12px'}}>
        <p style={{fontSize:'13px',fontWeight:600,marginBottom:'8px'}}>📊 Lab Results:</p>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',fontSize:'12px',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'var(--gray-50)',textAlign:'left'}}>
                <th style={{padding:'8px',borderBottom:'2px solid var(--gray-200)'}}>Parameter</th>
                <th style={{padding:'8px',borderBottom:'2px solid var(--gray-200)'}}>Value</th>
                <th style={{padding:'8px',borderBottom:'2px solid var(--gray-200)'}}>Unit</th>
                <th style={{padding:'8px',borderBottom:'2px solid var(--gray-200)'}}>Normal Range</th>
                <th style={{padding:'8px',borderBottom:'2px solid var(--gray-200)'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {labValues.map((lv, i) => (
                <tr key={i} style={{background: lv.isAbnormal ? '#fff5f5' : 'transparent'}}>
                  <td style={{padding:'6px 8px',borderBottom:'1px solid var(--gray-100)',fontWeight:500}}>{lv.parameter}</td>
                  <td style={{padding:'6px 8px',borderBottom:'1px solid var(--gray-100)',fontWeight:700,color: lv.isAbnormal ? 'var(--danger)' : 'var(--gray-700)'}}>
                    {lv.value}
                  </td>
                  <td style={{padding:'6px 8px',borderBottom:'1px solid var(--gray-100)',color:'var(--gray-500)'}}>{lv.unit}</td>
                  <td style={{padding:'6px 8px',borderBottom:'1px solid var(--gray-100)',color:'var(--gray-500)'}}>
                    {lv.normalRange ? `${lv.normalRange.min} - ${lv.normalRange.max}` : '-'}
                  </td>
                  <td style={{padding:'6px 8px',borderBottom:'1px solid var(--gray-100)'}}>
                    {lv.isAbnormal ? (
                      <span style={{color:'var(--danger)',fontWeight:600}}>⚠️ Abnormal</span>
                    ) : (
                      <span style={{color:'var(--success)',fontWeight:600}}>✓ Normal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'12px'}}>
        <div><h1>Medical Records</h1><p>Your complete health history</p></div>
        <button className="btn btn-primary" onClick={seedDummyRecords} disabled={seedLoading} style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <FiPlus /> {seedLoading ? 'Loading...' : 'Load Sample Records'}
        </button>
      </div>

      <div className="flex gap-2 mb-4" style={{flexWrap:'wrap'}}>
        {types.map(t => (
          <button key={t} className={`btn btn-sm ${filter === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setFilter(t); }}>{t === 'all' ? 'All' : `${getTypeIcon(t)} ${t.replace('-', ' ')}`}</button>
        ))}
      </div>

      {loading ? <div className="loading-page"><div className="spinner"></div></div> :
        records.length === 0 ? (
          <div className="empty-state">
            <FiFileText style={{fontSize:'48px'}} />
            <h3>No records found</h3>
            <p style={{color:'var(--gray-500)',marginTop:'8px'}}>Click "Load Sample Records" to add dummy prescriptions and lab reports</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {records.map(rec => {
              const isExpanded = expandedRecord === rec._id;
              const bpStr = formatBP(rec.vitals?.bloodPressure);
              return (
                <div key={rec._id} className="card" style={{padding:'16px',cursor:'pointer',transition:'all 0.2s',border: isExpanded ? '2px solid var(--primary)' : '2px solid transparent'}}
                  onClick={() => setExpandedRecord(isExpanded ? null : rec._id)}>
                  <div className="flex justify-between items-center" style={{flexWrap:'wrap',gap:'12px'}}>
                    <div style={{flex:1}}>
                      <div className="flex gap-2 items-center mb-2">
                        <span>{getTypeIcon(rec.type)}</span>
                        <span className={`badge ${getTypeBadge(rec.type)}`}>{rec.type?.replace('-',' ')}</span>
                        {rec.category && rec.category !== 'general' && <span className="badge badge-gray">{rec.category}</span>}
                        {rec.diagnosis?.length > 0 && rec.diagnosis.map((d,i) => (
                          <span key={i} className="badge badge-warning" style={{fontSize:'10px'}}>{d}</span>
                        ))}
                      </div>
                      <strong style={{fontSize:'15px'}}>{rec.title || rec.diagnosis?.[0] || 'Medical Record'}</strong>
                      <p style={{fontSize:'13px',color:'var(--gray-500)',marginTop:'4px'}}>
                        {rec.doctor ? `Dr. ${rec.doctor.firstName} ${rec.doctor.lastName}` : 'Doctor'} • {format(new Date(rec.date || rec.createdAt), 'MMMM d, yyyy')}
                      </p>
                      {rec.description && !isExpanded && (
                        <p style={{fontSize:'13px',marginTop:'6px',color:'var(--gray-600)'}}>{rec.description.substring(0, 120)}{rec.description.length > 120 ? '...' : ''}</p>
                      )}
                      {/* Vitals Summary */}
                      {rec.vitals && (
                        <div className="flex gap-3 mt-2" style={{flexWrap:'wrap'}}>
                          {bpStr && <span className="badge badge-info">BP: {bpStr}</span>}
                          {rec.vitals.heartRate && <span className="badge badge-danger">HR: {rec.vitals.heartRate}</span>}
                          {rec.vitals.temperature && <span className="badge badge-warning">Temp: {rec.vitals.temperature}°C</span>}
                          {rec.vitals.oxygenSaturation && <span className="badge badge-success">SpO2: {rec.vitals.oxygenSaturation}%</span>}
                          {rec.vitals.weight && <span className="badge badge-gray">Wt: {rec.vitals.weight} kg</span>}
                        </div>
                      )}
                      {/* Lab values abnormal count */}
                      {!isExpanded && rec.labValues?.length > 0 && (
                        <div className="flex gap-2 mt-2 items-center">
                          <span style={{fontSize:'12px',color:'var(--gray-500)'}}>{rec.labValues.length} parameters</span>
                          {rec.labValues.some(lv => lv.isAbnormal) && (
                            <span style={{fontSize:'12px',color:'var(--danger)',display:'flex',alignItems:'center',gap:'3px'}}>
                              <FiAlertTriangle /> {rec.labValues.filter(lv => lv.isAbnormal).length} abnormal
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      {rec.attachments?.length > 0 && (
                        <a href={`http://localhost:5000/${rec.attachments[0]}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline"
                          onClick={e => e.stopPropagation()}>
                          <FiDownload /> File
                        </a>
                      )}
                      {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div style={{marginTop:'16px',paddingTop:'16px',borderTop:'1px solid var(--gray-200)'}} onClick={e => e.stopPropagation()}>
                      {rec.description && (
                        <div style={{marginBottom:'12px'}}>
                          <p style={{fontSize:'13px',fontWeight:600,marginBottom:'4px'}}>Description:</p>
                          <p style={{fontSize:'13px',color:'var(--gray-600)'}}>{rec.description}</p>
                        </div>
                      )}

                      {rec.symptoms?.length > 0 && (
                        <div style={{marginBottom:'12px'}}>
                          <p style={{fontSize:'13px',fontWeight:600,marginBottom:'4px'}}>Symptoms:</p>
                          <div className="flex gap-2" style={{flexWrap:'wrap'}}>
                            {rec.symptoms.map((s, i) => <span key={i} className="badge badge-info">{s}</span>)}
                          </div>
                        </div>
                      )}

                      {/* Lab Values Table */}
                      {renderLabValues(rec.labValues)}

                      {/* Visit Notes / Prescription */}
                      {rec.visitNotes && (
                        <div style={{marginTop:'12px',padding:'14px',background:'var(--gray-50)',borderRadius:'8px',border:'1px solid var(--gray-200)'}}>
                          <p style={{fontSize:'13px',fontWeight:600,marginBottom:'8px'}}>
                            {rec.type === 'prescription' ? '📋 Prescription:' : rec.type === 'imaging' ? '📷 Report:' : '📝 Notes:'}
                          </p>
                          <pre style={{fontSize:'12px',color:'var(--gray-700)',whiteSpace:'pre-wrap',fontFamily:'inherit',margin:0,lineHeight:1.6}}>
                            {rec.visitNotes}
                          </pre>
                        </div>
                      )}

                      {rec.tags?.length > 0 && (
                        <div style={{marginTop:'12px'}}>
                          <div className="flex gap-2" style={{flexWrap:'wrap'}}>
                            {rec.tags.map((tag, i) => (
                              <span key={i} style={{padding:'2px 8px',background:'var(--gray-100)',borderRadius:'10px',fontSize:'11px',color:'var(--gray-500)'}}>#{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Analyze with AI button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/patient/report-analyzer?recordId=${rec._id}`); }}
                        style={{
                          marginTop:'16px', padding:'10px 20px', background:'linear-gradient(135deg,#059669,#10b981)',
                          color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:600,
                          display:'flex', alignItems:'center', gap:'8px', transition:'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(5,150,105,0.3)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <FiZap /> Analyze with AI
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
};

export default MedicalRecords;
