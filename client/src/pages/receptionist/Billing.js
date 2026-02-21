import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiPlus, FiDollarSign } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ReceptionistBilling = () => {
  const [bills, setBills] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ patient: '', items: [{ description: '', amount: 0 }], discount: 0, paymentMethod: 'cash' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/billing/today').then(r => setBills(r.data.data || r.data || [])).catch(() => {}),
      api.get('/api/admin/users?role=patient').then(r => setPatients(r.data.data || r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const addItem = () => setForm({...form, items: [...form.items, { description: '', amount: 0 }]});
  const updateItem = (i, f, v) => {
    const items = [...form.items];
    items[i] = {...items[i], [f]: v};
    setForm({...form, items});
  };

  const total = form.items.reduce((s, it) => s + (Number(it.amount) || 0), 0) - (Number(form.discount) || 0);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/billing', { ...form, totalAmount: total });
      toast.success('Bill created');
      setShowCreate(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const processPayment = async (id) => {
    try {
      await api.put(`/api/billing/${id}/pay`, { paymentMethod: 'cash', amountPaid: bills.find(b => b._id === id)?.totalAmount });
      toast.success('Payment processed');
      const { data } = await api.get('/api/billing/today');
      setBills(data.data || data || []);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div><h1>Billing</h1><p>Create and manage bills</p></div>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}><FiPlus /> New Bill</button>
      </div>

      {showCreate && (
        <div className="card mb-4">
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Patient</label>
              <select className="form-control" value={form.patient} onChange={e => setForm({...form, patient: e.target.value})} required>
                <option value="">Select patient</option>
                {patients.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <h4 className="mb-2">Line Items</h4>
            {form.items.map((it, i) => (
              <div key={i} className="form-row mb-2">
                <input className="form-control" placeholder="Description" value={it.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                <input type="number" className="form-control" placeholder="Amount" value={it.amount} onChange={e => updateItem(i, 'amount', e.target.value)} />
              </div>
            ))}
            <button type="button" className="btn btn-sm btn-secondary mb-3" onClick={addItem}><FiPlus /> Add Item</button>
            <div className="form-row">
              <div className="form-group"><label>Discount (₹)</label><input type="number" className="form-control" value={form.discount} onChange={e => setForm({...form, discount: e.target.value})} /></div>
              <div className="form-group">
                <label>Payment Method</label>
                <select className="form-control" value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}>
                  <option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option><option value="insurance">Insurance</option>
                </select>
              </div>
            </div>
            <p style={{fontSize:'18px',fontWeight:700,marginBottom:'16px'}}>Total: ₹{total}</p>
            <button type="submit" className="btn btn-primary">Create Bill</button>
          </form>
        </div>
      )}

      <div className="table-container card">
        <table>
          <thead><tr><th>Invoice</th><th>Patient</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {bills.length === 0 ? <tr><td colSpan="5" className="text-center" style={{padding:'30px',color:'var(--gray-500)'}}>No bills today</td></tr> :
              bills.map(b => (
                <tr key={b._id}>
                  <td>{b.invoiceNumber || b._id.slice(-6)}</td>
                  <td>{b.patient?.firstName} {b.patient?.lastName || 'Patient'}</td>
                  <td><strong>₹{b.totalAmount}</strong></td>
                  <td><span className={`badge ${b.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{b.status}</span></td>
                  <td>{b.status === 'pending' && <button className="btn btn-sm btn-success" onClick={() => processPayment(b._id)}><FiDollarSign /> Pay</button>}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReceptionistBilling;
