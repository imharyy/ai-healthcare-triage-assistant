import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { FiVideo, FiMessageSquare, FiSend } from 'react-icons/fi';
import { format } from 'date-fns';

const Telemedicine = () => {
  const { socket } = useSocket();
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [chatMsg, setChatMsg] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/telemedicine/my')
      .then(r => setSessions(r.data.data || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!socket || !activeSession) return;
    const handler = (msg) => setMessages(prev => [...prev, msg]);
    socket.on('chatMessage', handler);
    return () => socket.off('chatMessage', handler);
  }, [socket, activeSession]);

  const joinSession = (session) => {
    setActiveSession(session);
    setMessages(session.chat || []);
    if (socket) socket.emit('joinRoom', `tele_${session.roomId}`);
  };

  const sendMsg = () => {
    if (!chatMsg.trim() || !socket || !activeSession) return;
    socket.emit('chatMessage', { room: `tele_${activeSession.roomId}`, message: chatMsg, sender: 'patient' });
    setMessages(prev => [...prev, { message: chatMsg, sender: 'patient', timestamp: new Date() }]);
    setChatMsg('');
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  if (activeSession) return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2>Teleconsultation with Dr. {activeSession.doctor?.firstName} {activeSession.doctor?.lastName}</h2>
        <button className="btn btn-secondary" onClick={() => setActiveSession(null)}>Back</button>
      </div>
      <div className="grid-2">
        <div className="card" style={{minHeight:'400px',background:'#1a1a2e',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',color:'white'}}>
          <div className="text-center">
            <FiVideo style={{fontSize:'48px',marginBottom:'16px'}} />
            <p>Video consultation area</p>
            <p style={{fontSize:'13px',opacity:0.7}}>Room: {activeSession.roomId}</p>
          </div>
        </div>
        <div className="card flex flex-col" style={{height:'400px'}}>
          <h3 className="card-title" style={{marginBottom:'12px'}}><FiMessageSquare /> Chat</h3>
          <div style={{flex:1,overflow:'auto',padding:'8px',background:'var(--gray-50)',borderRadius:'8px',marginBottom:'12px'}}>
            {messages.map((m, i) => (
              <div key={i} style={{marginBottom:'8px',textAlign: m.sender === 'patient' ? 'right' : 'left'}}>
                <span style={{display:'inline-block',padding:'8px 12px',borderRadius:'12px',fontSize:'13px',maxWidth:'80%',
                  background: m.sender === 'patient' ? 'var(--primary)' : 'var(--gray-200)',
                  color: m.sender === 'patient' ? 'white' : 'var(--gray-800)'}}>
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
      <div className="page-header"><h1>Telemedicine</h1><p>Your video consultations</p></div>

      {sessions.length === 0 ? (
        <div className="empty-state"><FiVideo style={{fontSize:'48px'}} /><h3>No telemedicine sessions</h3></div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map(s => (
            <div key={s._id} className="card" style={{padding:'16px'}}>
              <div className="flex justify-between items-center">
                <div>
                  <strong>Dr. {s.doctor?.firstName} {s.doctor?.lastName}</strong>
                  <p style={{fontSize:'13px',color:'var(--gray-500)'}}>
                    {format(new Date(s.scheduledAt || s.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                  <span className={`badge ${s.status === 'active' ? 'badge-success' : s.status === 'scheduled' ? 'badge-info' : 'badge-gray'}`}>{s.status}</span>
                </div>
                {['active', 'scheduled'].includes(s.status) && (
                  <button className="btn btn-primary" onClick={() => joinSession(s)}><FiVideo /> Join</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Telemedicine;
