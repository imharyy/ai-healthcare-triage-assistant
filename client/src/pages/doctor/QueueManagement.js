import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { FiPlay, FiSkipForward, FiCheck, FiPause, FiClock, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const QueueManagement = () => {
  const { socket } = useSocket();
  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [delayMin, setDelayMin] = useState('');

  const loadQueue = async () => {
    try {
      const { data } = await api.get('/api/queue/my-queue');
      setQueue(data.data || data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadQueue(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('queueUpdate', loadQueue);
    return () => socket.off('queueUpdate', loadQueue);
  }, [socket]);

  const callNext = async () => {
    try {
      await api.post('/api/queue/call-next');
      toast.success('Next patient called');
      loadQueue();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const startConsultation = async (patientId) => {
    try {
      await api.post(`/api/doctors/start-consultation/${patientId}`);
      toast.success('Consultation started');
      loadQueue();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const completeConsultation = async (patientId) => {
    try {
      await api.post(`/api/doctors/complete-consultation/${patientId}`);
      toast.success('Consultation completed');
      loadQueue();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const skipPatient = async (patientId) => {
    try {
      await api.post(`/api/doctors/skip-patient/${patientId}`);
      toast('Patient skipped');
      loadQueue();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const setDelay = async () => {
    if (!delayMin) return;
    try {
      await api.post('/api/queue/set-delay', { delayMinutes: parseInt(delayMin) });
      toast.success(`Delay of ${delayMin} min set`);
      setDelayMin('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const pauseQueue = async () => {
    try {
      await api.post('/api/doctors/pause-queue');
      toast('Queue paused');
      loadQueue();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const resumeQueue = async () => {
    try {
      await api.post('/api/doctors/resume-queue');
      toast.success('Queue resumed');
      loadQueue();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  const entries = queue?.entries || [];
  const waiting = entries.filter(e => e.status === 'waiting');
  const current = entries.find(e => e.status === 'in-progress');

  return (
    <div>
      <div className="page-header"><h1>Patient Queue</h1><p>Manage your patient queue in real-time</p></div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary"><FiClock /></div>
          <div className="stat-info"><h3>{waiting.length}</h3><p>Waiting</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success"><FiPlay /></div>
          <div className="stat-info"><h3>{current ? 'Yes' : 'No'}</h3><p>Active Consultation</p></div>
        </div>
      </div>

      {/* Actions */}
      <div className="card mb-4">
        <div className="flex gap-2 items-center" style={{flexWrap:'wrap'}}>
          <button className="btn btn-primary" onClick={callNext}><FiPlay /> Call Next</button>
          <button className="btn btn-warning" onClick={pauseQueue}><FiPause /> Pause</button>
          <button className="btn btn-success" onClick={resumeQueue}><FiPlay /> Resume</button>
          <div className="flex gap-2 items-center" style={{marginLeft:'auto'}}>
            <input className="form-control" style={{width:'80px'}} placeholder="Min" type="number" value={delayMin} onChange={e => setDelayMin(e.target.value)} />
            <button className="btn btn-secondary" onClick={setDelay}><FiAlertCircle /> Set Delay</button>
          </div>
        </div>
      </div>

      {/* Current Patient */}
      {current && (
        <div className="card mb-4" style={{border:'2px solid var(--success)',background:'#ECFDF5'}}>
          <h3 className="card-title mb-3" style={{color:'var(--success)'}}>🩺 Currently Consulting</h3>
          <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center">
              <div className="queue-token" style={{background:'var(--success)'}}>{current.tokenNumber}</div>
              <div>
                <strong>{current.patient?.firstName} {current.patient?.lastName || 'Patient'}</strong>
                <p style={{fontSize:'12px',color:'var(--gray-500)'}}>{current.patient?.phone}</p>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => completeConsultation(current.patient?._id || current.patient)}>
              <FiCheck /> Complete
            </button>
          </div>
        </div>
      )}

      {/* Waiting List */}
      <div className="card">
        <h3 className="card-title mb-3">Waiting List ({waiting.length})</h3>
        {waiting.length === 0 ? (
          <p className="text-center" style={{color:'var(--gray-500)',padding:'20px'}}>No patients waiting</p>
        ) : waiting.map((entry, i) => (
          <div key={entry._id || i} className="queue-item">
            <div className="flex gap-3 items-center">
              <div className="queue-token">{entry.tokenNumber || i + 1}</div>
              <div>
                <strong>{entry.patient?.firstName} {entry.patient?.lastName || 'Patient'}</strong>
                <p style={{fontSize:'12px',color:'var(--gray-500)'}}>
                  Wait: ~{entry.estimatedWaitTime || '--'} min
                  {entry.priority !== 'normal' && <span className={`badge ${entry.priority === 'emergency' ? 'badge-danger' : 'badge-warning'}`} style={{marginLeft:'8px'}}>{entry.priority}</span>}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-sm btn-success" onClick={() => startConsultation(entry.patient?._id || entry.patient)}>
                <FiPlay /> Start
              </button>
              <button className="btn btn-sm btn-secondary" onClick={() => skipPatient(entry.patient?._id || entry.patient)}>
                <FiSkipForward />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QueueManagement;
