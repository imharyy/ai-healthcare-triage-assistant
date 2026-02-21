import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiDollarSign, FiDownload } from 'react-icons/fi';
import { format } from 'date-fns';

const Billing = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/billing/my')
      .then(r => setBills(r.data.data || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (s) => {
    const m = { pending: 'badge-warning', paid: 'badge-success', 'partially-paid': 'badge-info', overdue: 'badge-danger' };
    return <span className={`badge ${m[s] || 'badge-gray'}`}>{s}</span>;
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header"><h1>Billing</h1><p>Your invoices and payments</p></div>

      {bills.length === 0 ? (
        <div className="empty-state"><FiDollarSign style={{fontSize:'48px'}} /><h3>No bills</h3></div>
      ) : (
        <div className="flex flex-col gap-3">
          {bills.map(bill => (
            <div key={bill._id} className="card" style={{padding:'16px'}}>
              <div className="flex justify-between items-center" style={{flexWrap:'wrap',gap:'12px'}}>
                <div>
                  <strong>{bill.invoiceNumber || `Bill #${bill._id.slice(-6)}`}</strong>
                  {getStatusBadge(bill.status)}
                  <p style={{fontSize:'13px',color:'var(--gray-500)',marginTop:'4px'}}>
                    {format(new Date(bill.createdAt), 'MMM d, yyyy')}
                  </p>
                  <div className="flex gap-3 mt-2">
                    <span style={{fontSize:'13px'}}>Total: <strong>₹{bill.totalAmount}</strong></span>
                    {bill.insuranceClaim?.status && <span className="badge badge-info">Insurance: {bill.insuranceClaim.status}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {bill.status === 'pending' && <button className="btn btn-sm btn-success">Pay Now</button>}
                  <button className="btn btn-sm btn-outline"><FiDownload /> Invoice</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Billing;
