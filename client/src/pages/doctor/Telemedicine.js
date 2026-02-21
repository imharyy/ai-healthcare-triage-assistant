import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { FiVideo, FiMessageSquare, FiSend, FiPhoneOff } from 'react-icons/fi';
import toast from 'react-hot-toast';

const DoctorTelemedicine = () => {
  const { socket } = useSocket();
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [chatMsg, setChatMsg] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/telemedicine/my')
      .then(r => setSessions(r.data.data || r.data || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!socket || !activeSession) return;
    const handler = (msg) => setMessages(prev => [...prev, msg]);
    socket.on('chatMessage', handler);
    return () => socket.off('chatMessage', handler);
  }, [socket, activeSession]);

  const startSession = async (session) => {
    try {
      await api.put(`/api/telemedicine/${session._id}/start`);
      setActiveSession(session);
      setMessages(session.chat || []);
      if (socket) socket.emit('joinRoom', `tele_${session.roomId}`);
      toast.success('Session started');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const endSession = async () => {
    if (!activeSession) return;
    try {
      await api.put(`/api/telemedicine/${activeSession._id}/end`);
      setActiveSession(null);
      toast.success('Session ended');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const sendMsg = () => {
    if (!chatMsg.trim() || !socket || !activeSession) return;
    socket.emit('chatMessage', { room: `tele_${activeSession.roomId}`, message: chatMsg, sender: 'doctor' });
    setMessages(prev => [...prev, { message: chatMsg, sender: 'doctor', timestamp: new Date() }]);
    setChatMsg('');
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  if (activeSession) return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2>Teleconsultation with {activeSession.patient?.firstName} {activeSession.patient?.lastName}</h2>
        <button className="btn btn-danger" onClick={endSession}><FiPhoneOff /> End Session</button>
      </div>
      <div className="grid-2">
        <div className="card" style={{minHeight:'400px',background:'#1a1a2e',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',color:'white'}}>
          <div className="text-center">
            <FiVideo style={{fontSize:'48px',marginBottom:'16px'}} />
            <p>Video consultation area</p>
          </div>
        </div>
        <div className="card flex flex-col" style={{height:'400px'}}>
          <h3 className="card-title" style={{marginBottom:'12px'}}><FiMessageSquare /> Chat</h3>
          <div style={{flex:1,overflow:'auto',padding:'8px',background:'var(--gray-50)',borderRadius:'8px',marginBottom:'12px'}}>
            {messages.map((m, i) => (
              <div key={i} style={{marginBottom:'8px',textAlign: m.sender === 'doctor' ? 'right' : 'left'}}>
                <span style={{display:'inline-block',padding:'8px 12px',borderRadius:'12px',fontSize:'13px',maxWidth:'80%',
                  background: m.sender === 'doctor' ? 'var(--primary)' : 'var(--gray-200)',
                  color: m.sender === 'doctor' ? 'white' : 'var(--gray-800)'}}>
                  {m.message}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="form-control" placeholder="Type message..." value={chatMsg}
              onChange={e => setChatMsg(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMsg()} />
            <button className="btn btn-primary" onClick={sendMsg}><FiSend /></button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header"><h1>Telemedicine</h1><p>Manage video consultations</p></div>
      {sessions.length === 0 ? <div className="empty-state"><FiVideo style={{fontSize:'48px'}} /><h3>No sessions</h3></div> :
        <div className="flex flex-col gap-3">
          {sessions.map(s => (
            <div key={s._id} className="card" style={{padding:'16px'}}>
              <div className="flex justify-between items-center">
                <div>
                  <strong>{s.patient?.firstName} {s.patient?.lastName || 'Patient'}</strong>
                  <p style={{fontSize:'13px',color:'var(--gray-500)'}}>
                    {new Date(s.scheduledAt || s.createdAt).toLocaleString()}
                  </p>
                  <span className={`badge ${s.status === 'active' ? 'badge-success' : s.status === 'scheduled' ? 'badge-info' : 'badge-gray'}`}>{s.status}</span>
                </div>
                {['scheduled'].includes(s.status) && <button className="btn btn-primary" onClick={() => startSession(s)}><FiVideo /> Start</button>}
                {s.status === 'active' && <button className="btn btn-success" onClick={() => { setActiveSession(s); setMessages(s.chat || []); }}><FiVideo /> Join</button>}
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
};

export default DoctorTelemedicine;
