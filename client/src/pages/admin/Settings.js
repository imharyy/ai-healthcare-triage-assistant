import React from 'react';
import { FiSettings } from 'react-icons/fi';

const Settings = () => {
  return (
    <div>
      <div className="page-header"><h1>Settings</h1><p>System configuration</p></div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title mb-3"><FiSettings /> General Settings</h3>
          <div className="form-group"><label>System Name</label><input className="form-control" defaultValue="HealHub" /></div>
          <div className="form-group"><label>Time Zone</label>
            <select className="form-control"><option>Asia/Kolkata (IST)</option><option>UTC</option></select>
          </div>
          <div className="form-group"><label>Default Language</label>
            <select className="form-control"><option>English</option><option>Hindi</option></select>
          </div>
          <button className="btn btn-primary mt-3">Save Settings</button>
        </div>

        <div className="card">
          <h3 className="card-title mb-3">Notification Settings</h3>
          <div className="flex flex-col gap-3">
            {['Email Notifications', 'SMS Alerts', 'Push Notifications', 'Appointment Reminders', 'Queue Updates'].map(item => (
              <label key={item} className="flex justify-between items-center" style={{padding:'12px',background:'var(--gray-50)',borderRadius:'8px',cursor:'pointer'}}>
                <span style={{fontWeight:500}}>{item}</span>
                <input type="checkbox" defaultChecked />
              </label>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="card-title mb-3">Appointment Settings</h3>
          <div className="form-group"><label>Default Slot Duration (minutes)</label><input type="number" className="form-control" defaultValue={15} /></div>
          <div className="form-group"><label>Max Advance Booking (days)</label><input type="number" className="form-control" defaultValue={30} /></div>
          <div className="form-group"><label>Cancellation Window (hours)</label><input type="number" className="form-control" defaultValue={2} /></div>
          <button className="btn btn-primary mt-3">Save</button>
        </div>

        <div className="card">
          <h3 className="card-title mb-3">Security Settings</h3>
          <div className="flex flex-col gap-3">
            {['Enforce 2FA for Doctors', 'Enforce 2FA for Admins', 'Session Timeout (30 min)', 'IP Whitelisting', 'Audit Logging'].map(item => (
              <label key={item} className="flex justify-between items-center" style={{padding:'12px',background:'var(--gray-50)',borderRadius:'8px',cursor:'pointer'}}>
                <span style={{fontWeight:500}}>{item}</span>
                <input type="checkbox" defaultChecked={item.includes('Audit')} />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
