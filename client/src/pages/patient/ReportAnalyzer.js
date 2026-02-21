import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { FiArrowLeft, FiSearch, FiZap, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './ReportAnalyzer.css';

const severityConfig = {
  none: { icon: '✅', label: 'All Normal', color: '#059669' },
  mild: { icon: '💚', label: 'Mild', color: '#2563eb' },
  moderate: { icon: '⚠️', label: 'Moderate', color: '#d97706' },
  severe: { icon: '🔴', label: 'Severe', color: '#dc2626' },
  critical: { icon: '🚨', label: 'Critical', color: '#dc2626' },
  unknown: { icon: '❓', label: 'Needs Review', color: '#6b7280' },
};

const ReportAnalyzer = () => {
  const [searchParams] = useSearchParams();
  const preSelectedId = searchParams.get('recordId');

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      let recs = [];
      // Try dedicated report-analyzer endpoint first
      try {
        const { data } = await api.get('/api/report-analyzer/records');
        recs = data.data || [];
      } catch {
        // Fallback: fetch from main medical-records endpoint
        const { data } = await api.get('/api/medical-records');
        const all = data.data || data || [];
        recs = all.filter(r => ['lab-report', 'imaging', 'prescription'].includes(r.type));
      }
      setRecords(recs);
      // Auto-select if recordId is in query string
      if (preSelectedId) {
        const found = recs.find(r => r._id === preSelectedId);
        if (found) {
          setSelectedRecord(found);
        }
      }
    } catch {
      toast.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const analyzeRecord = async () => {
    if (!selectedRecord) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const { data } = await api.post('/api/report-analyzer/analyze', { recordId: selectedRecord._id });
      setResult(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  // Auto-analyze when coming from Medical Records with a recordId
  useEffect(() => {
    if (preSelectedId && selectedRecord && !result && !analyzing) {
      analyzeRecord();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRecord]);

  const getTypeIcon = (type) => {
    const map = { 'lab-report': '🧪', 'imaging': '📷', 'prescription': '📋' };
    return map[type] || '📄';
  };

  const filteredRecords = records.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.title?.toLowerCase().includes(term) ||
      r.type?.toLowerCase().includes(term) ||
      r.category?.toLowerCase().includes(term) ||
      r.diagnosis?.some(d => d.toLowerCase().includes(term))
    );
  });

  const resetAnalysis = () => {
    setResult(null);
    setSelectedRecord(null);
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="report-analyzer">
      {/* Header */}
      <div className="ra-banner">
        <div className="ra-banner-info">
          <div className="ra-banner-icon">🔬</div>
          <div>
            <h2>AI Report Analyzer</h2>
            <p>Analyze your lab reports & radiology scans for severity, medications, home remedies and estimated costs</p>
          </div>
        </div>
      </div>

      {/* If we have results, show them */}
      {result ? (
        <div className="ra-results">
          <button className="ra-back-btn" onClick={resetAnalysis}>
            <FiArrowLeft /> Analyze Another Report
          </button>

          {/* Record info */}
          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--gray-500)' }}>
            Analyzing: <strong style={{ color: 'var(--gray-700)' }}>{result.record?.title}</strong>
            {' '} — {result.record?.type?.replace('-', ' ')} • {result.record?.date && format(new Date(result.record.date), 'MMM d, yyyy')}
            {result.analysis?.source === 'ai' && <span className="badge badge-info" style={{ marginLeft: '8px' }}>AI Powered</span>}
            {result.analysis?.source === 'local' && <span className="badge badge-gray" style={{ marginLeft: '8px' }}>Rule-Based</span>}
          </div>

          {/* Severity banner */}
          {(() => {
            const sev = result.analysis?.overallSeverity || 'unknown';
            const conf = severityConfig[sev] || severityConfig.unknown;
            return (
              <div className={`ra-severity-banner ${sev}`}>
                <span className="ra-severity-icon">{conf.icon}</span>
                <div className="ra-severity-text">
                  <h3>Severity: {conf.label}</h3>
                  <p>{result.analysis?.summary}</p>
                </div>
                {result.analysis?.severityScore && (
                  <div className="ra-severity-score">{result.analysis.severityScore}/10</div>
                )}
              </div>
            );
          })()}

          {/* Urgency & Follow-up */}
          {(result.analysis?.urgencyLevel || result.analysis?.followUpAdvice) && (
            <div className="ra-section" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {result.analysis.urgencyLevel && (
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '4px' }}>Urgency</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: result.analysis.urgencyLevel === 'emergency' ? '#dc2626' : result.analysis.urgencyLevel === 'urgent' ? '#f59e0b' : '#059669' }}>
                    {result.analysis.urgencyLevel === 'emergency' ? '🚨' : result.analysis.urgencyLevel === 'urgent' ? '⚠️' : result.analysis.urgencyLevel === 'soon' ? '📋' : '✅'} {result.analysis.urgencyLevel.charAt(0).toUpperCase() + result.analysis.urgencyLevel.slice(1)}
                  </div>
                </div>
              )}
              {result.analysis.followUpAdvice && (
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '4px' }}>Follow-up Advice</div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-700)' }}>{result.analysis.followUpAdvice}</div>
                </div>
              )}
              {result.analysis.specialistRecommendation && (
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '4px' }}>Specialist</div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-700)' }}>{result.analysis.specialistRecommendation}</div>
                </div>
              )}
            </div>
          )}

          {/* Findings */}
          {result.analysis?.findings?.length > 0 && (
            <div className="ra-section">
              <div className="ra-section-title"><span>📊</span> Detailed Findings</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="ra-findings-table">
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Value</th>
                      <th>Status</th>
                      <th>Severity</th>
                      <th>Interpretation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.analysis.findings.map((f, i) => (
                      <tr key={i} className={f.status !== 'normal' && f.status !== 'noted' ? 'abnormal' : ''}>
                        <td style={{ fontWeight: 500 }}>{f.parameter}</td>
                        <td>{f.value || '-'}</td>
                        <td>
                          {f.status === 'normal' ? (
                            <span style={{ color: '#059669' }}>✓ Normal</span>
                          ) : f.status?.includes('critical') ? (
                            <span style={{ color: '#dc2626', fontWeight: 700 }}>🚨 {f.status}</span>
                          ) : (
                            <span style={{ color: '#d97706' }}>⚠ {f.status}</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${f.severity === 'none' ? 'badge-success' : f.severity === 'mild' ? 'badge-info' : f.severity === 'moderate' ? 'badge-warning' : 'badge-danger'}`}>
                            {f.severity}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--gray-600)', maxWidth: '280px' }}>{f.interpretation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Medications */}
          {result.analysis?.medications?.length > 0 && (
            <div className="ra-section">
              <div className="ra-section-title"><span>💊</span> Recommended Medications</div>
              <div className="ra-med-list">
                {result.analysis.medications.map((med, i) => (
                  <div key={i} className="ra-med-card">
                    <span className="med-icon">💊</span>
                    <div>
                      <strong>{med.name}</strong>
                      {med.purpose && <p>{med.purpose}</p>}
                      {med.duration && <p>Duration: {med.duration}</p>}
                      {med.note && <p style={{ color: '#d97706' }}>⚠ {med.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '12px' }}>
                ⚠️ Disclaimer: These are AI-generated suggestions. Always consult a qualified doctor before taking any medication.
              </p>
            </div>
          )}

          {/* Home Cures */}
          {result.analysis?.homeCure?.length > 0 && (
            <div className="ra-section">
              <div className="ra-section-title"><span>🏡</span> Home Remedies & Lifestyle</div>
              <div className="ra-home-list">
                {result.analysis.homeCure.map((cure, i) => (
                  <div key={i} className="ra-home-item">🌿 {cure}</div>
                ))}
              </div>
            </div>
          )}

          {/* Diet Recommendations */}
          {result.analysis?.dietRecommendations?.length > 0 && (
            <div className="ra-section">
              <div className="ra-section-title"><span>🥗</span> Diet Recommendations</div>
              <div className="ra-home-list">
                {result.analysis.dietRecommendations.map((item, i) => (
                  <div key={i} className="ra-home-item" style={{ background: 'rgba(37,99,235,0.06)', color: '#2563eb' }}>🍎 {item}</div>
                ))}
              </div>
            </div>
          )}

          {/* Estimated Cost */}
          {result.analysis?.estimatedCost && Object.keys(result.analysis.estimatedCost).length > 0 && (
            <div className="ra-section">
              <div className="ra-section-title"><span>💰</span> Estimated Treatment Cost (INR)</div>
              <div className="ra-cost-grid">
                {Object.entries(result.analysis.estimatedCost).map(([key, val]) => (
                  val ? (
                    <div key={key} className="ra-cost-item">
                      <div className="cost-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</div>
                      <div className="cost-value">₹{typeof val === 'number' ? val.toLocaleString('en-IN') : val}</div>
                    </div>
                  ) : null
                ))}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '12px' }}>
                * Costs are approximate and may vary by location and hospital.
              </p>
            </div>
          )}

          {/* Warning Signs */}
          {result.analysis?.warningSignsToWatch?.length > 0 && (
            <div className="ra-section" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
              <div className="ra-section-title"><span>⚠️</span> Warning Signs to Watch</div>
              <div className="ra-warnings">
                {result.analysis.warningSignsToWatch.map((w, i) => (
                  <div key={i} className="ra-warning-tag"><FiAlertTriangle /> {w}</div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            <Link to="/patient/book-appointment" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              📅 Book Doctor Appointment
            </Link>
            <Link to="/patient/ai-assistant" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              🤖 Discuss with AI Assistant
            </Link>
          </div>
        </div>
      ) : analyzing ? (
        <div className="ra-analyzing">
          <div className="ra-analyzing-spinner"></div>
          <h3>Analyzing Your Report...</h3>
          <p>Our AI is examining your {selectedRecord?.type?.replace('-', ' ')} report for severity, medications, and cost estimates</p>
        </div>
      ) : (
        <>
          {/* Record selector */}
          <div className="ra-selector">
            <h3>Select a Record to Analyze</h3>
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input
                type="text"
                placeholder="Search by title, type, or diagnosis..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px 10px 36px',
                  border: '1px solid var(--gray-200)', borderRadius: '8px',
                  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {filteredRecords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-500)' }}>
                <p style={{ fontSize: '36px', marginBottom: '12px' }}>📂</p>
                <h3 style={{ color: 'var(--gray-600)' }}>No Analyzable Records Found</h3>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  Load sample records from the <Link to="/patient/records" style={{ color: '#059669' }}>Medical Records</Link> section first.
                </p>
              </div>
            ) : (
              <div className="ra-record-list">
                {filteredRecords.map(rec => (
                  <div
                    key={rec._id}
                    className={`ra-record-item ${selectedRecord?._id === rec._id ? 'selected' : ''}`}
                    onClick={() => setSelectedRecord(rec)}
                  >
                    <div className="ra-record-left">
                      <div className={`ra-record-icon ${rec.type === 'lab-report' ? 'lab' : rec.type === 'imaging' ? 'imaging' : 'prescription'}`}>
                        {getTypeIcon(rec.type)}
                      </div>
                      <div className="ra-record-meta">
                        <strong>{rec.title}</strong>
                        <span>
                          {rec.doctor ? `Dr. ${rec.doctor.firstName} ${rec.doctor.lastName}` : 'Doctor'}
                          {' • '}{format(new Date(rec.date || rec.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="ra-record-badges">
                      <span className={`badge ${rec.type === 'lab-report' ? 'badge-info' : rec.type === 'imaging' ? 'badge-warning' : 'badge-primary'}`}>
                        {rec.type?.replace('-', ' ')}
                      </span>
                      {rec.labValues?.some(lv => lv.isAbnormal) && (
                        <span className="badge badge-danger">⚠ Abnormal</span>
                      )}
                      {selectedRecord?._id === rec._id && <FiCheckCircle style={{ color: '#059669', fontSize: '18px' }} />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              className="ra-analyze-btn"
              onClick={analyzeRecord}
              disabled={!selectedRecord}
            >
              <FiZap /> {selectedRecord ? `Analyze "${selectedRecord.title}"` : 'Select a record first'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportAnalyzer;
