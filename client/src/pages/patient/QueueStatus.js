import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { FiClock, FiUsers, FiAlertCircle } from 'react-icons/fi';

const QueueStatus = () => {
  const { socket, joinQueue } = useSocket();
  const [position, setPosition] = useState(null);
  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/api/queue/my-position');
        const d = data.data || data;
        setPosition(d);
        if (d.queueId) joinQueue(d.queueId);
      } catch {} finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (update) => {
      setPosition(prev => prev ? { ...prev, ...update } : update);
    };
    socket.on('queueUpdate', handler);
    socket.on('yourTurn', () => { setPosition(prev => prev ? {...prev, position: 0} : prev); });
    return () => { socket.off('queueUpdate', handler); socket.off('yourTurn'); };
  }, [socket]);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  if (!position || !position.queueId) return (
    <div>
      <div className="page-header"><h1>Queue Status</h1></div>
      <div className="empty-state">
        <FiUsers style={{fontSize:'48px'}} />
        <h3>Not in any queue</h3>
        <p>Check in to an appointment to join the queue</p>
      </div>
    </div>
  );

  const isMyTurn = position.position === 0 || position.position === 1;

  return (
    <div>
      <div className="page-header"><h1>Queue Status</h1><p>Real-time updates for your visit</p></div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className={`stat-icon ${isMyTurn ? 'success' : 'primary'}`}><FiUsers /></div>
          <div className="stat-info">
            <h3>{isMyTurn ? "It's Your Turn!" : `#${position.position}`}</h3>
            <p>Queue Position</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning"><FiClock /></div>
          <div className="stat-info">
            <h3>{position.estimatedWaitTime || '--'} min</h3>
            <p>Estimated Wait</p>
          </div>
        </div>
      </div>

      {isMyTurn && (
        <div className="card" style={{background:'linear-gradient(135deg,#10B981,#059669)',color:'white',textAlign:'center',padding:'40px'}}>
          <h2 style={{fontSize:'28px',marginBottom:'8px'}}>🎉 It's Your Turn!</h2>
          <p>Please proceed to the doctor's cabin</p>
        </div>
      )}

      {position.doctorDelay && (
        <div className="card mt-4" style={{background:'#FFFBEB',border:'1px solid #F59E0B'}}>
          <div className="flex gap-2 items-center">
            <FiAlertCircle style={{color:'#D97706',fontSize:'20px'}} />
            <div>
              <strong style={{color:'#92400E'}}>Doctor Delay Notice</strong>
              <p style={{fontSize:'13px',color:'#78350F'}}>The doctor is running behind by approximately {position.doctorDelay} minutes</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueStatus;
