import React, { useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { FiAlertTriangle, FiPhone, FiMapPin } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Emergency = () => {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [location, setLocation] = useState(null);

  const triggerEmergency = async () => {
    setSending(true);
    try {
      let coords = null;
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
      } catch { /* location unavailable */ }

      await api.post('/api/emergency', {
        location: coords ? { type: 'Point', coordinates: [coords.lng, coords.lat] } : undefined,
        description: 'Emergency SOS triggered from app',
      });
      setSent(true);
      toast.success('Emergency alert sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send alert');
    } finally { setSending(false); }
  };

  return (
    <div>
      <div className="page-header"><h1>Emergency SOS</h1><p>One-tap emergency assistance</p></div>

      <div className="card text-center" style={{padding:'60px 40px'}}>
        {!sent ? (
          <>
            <FiAlertTriangle style={{fontSize:'64px',color:'var(--danger)',marginBottom:'20px'}} />
            <h2 style={{marginBottom:'12px'}}>Need Emergency Help?</h2>
            <p style={{color:'var(--gray-500)',marginBottom:'30px',maxWidth:'400px',margin:'0 auto 30px'}}>
              Press the button below to alert the hospital and request emergency assistance
            </p>
            <button className="btn btn-emergency" onClick={triggerEmergency} disabled={sending}
              style={{margin:'0 auto',display:'flex'}}>
              <FiAlertTriangle /> {sending ? 'Sending Alert...' : 'EMERGENCY SOS'}
            </button>
            <div className="mt-4" style={{display:'flex',gap:'20px',justifyContent:'center',flexWrap:'wrap'}}>
              <a href="tel:108" className="btn btn-danger"><FiPhone /> Call 108</a>
              <a href="tel:102" className="btn btn-outline"><FiPhone /> Call 102</a>
            </div>
          </>
        ) : (
          <>
            <div style={{width:'80px',height:'80px',borderRadius:'50%',background:'#ECFDF5',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
              <FiAlertTriangle style={{fontSize:'36px',color:'var(--success)'}} />
            </div>
            <h2 style={{color:'var(--success)',marginBottom:'12px'}}>Alert Sent!</h2>
            <p style={{color:'var(--gray-500)'}}>Help is on the way. Stay calm.</p>
            {location && (
              <p style={{fontSize:'13px',marginTop:'12px',color:'var(--gray-400)'}}>
                <FiMapPin /> Location shared: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </p>
            )}
            <div className="mt-4">
              <h4 style={{marginBottom:'8px'}}>Emergency Contacts</h4>
              {user?.emergencyContacts?.map((c, i) => (
                <p key={i} style={{fontSize:'14px'}}>{c.name}: <a href={`tel:${c.phone}`} style={{color:'var(--primary)'}}>{c.phone}</a></p>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Emergency;
