import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { FiSearch, FiCalendar, FiClock, FiPackage, FiCheck, FiX, FiChevronDown, FiChevronUp, FiFilter, FiShoppingCart, FiInfo } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './BookDiagnostic.css';

const tabConfig = [
  { key: 'pathology', label: '🧪 Pathology', icon: '🧪' },
  { key: 'radiology', label: '📷 Radiology', icon: '📷' },
  { key: 'packages', label: '📦 Health Packages', icon: '📦' }
];

const categoryLabels = {
  blood: '🩸 Blood Tests',
  urine: '🧪 Urine Tests',
  stool: '🔬 Stool Tests',
  hormonal: '💉 Hormonal Tests',
  cardiac: '❤️ Cardiac Tests',
  allergy: '🤧 Allergy Tests',
  imaging: '📷 Imaging',
  xray: '☢️ X-Ray',
  ultrasound: '📡 Ultrasound',
  ct: '🔬 CT Scan',
  mri: '🧲 MRI',
  mammography: '🩺 Mammography',
  dexa: '🦴 Bone Density',
  ecg: '💓 ECG',
  'stress-test': '🏃 Stress Test'
};

const BookDiagnostic = () => {
  const [tab, setTab] = useState('pathology');
  const [tests, setTests] = useState([]);
  const [packages, setPackages] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cart, setCart] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [step, setStep] = useState(1); // 1=browse, 2=schedule, 3=confirm
  const [selectedDate, setSelectedDate] = useState('');
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedTest, setExpandedTest] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [showBookings, setShowBookings] = useState(false);

  useEffect(() => {
    loadTests();
    loadPackages();
    loadMyBookings();
  }, []);

  useEffect(() => {
    loadTests();
    setCategoryFilter('all');
    setSearch('');
  }, [tab]);

  const loadTests = async () => {
    if (tab === 'packages') return;
    try {
      const { data } = await api.get(`/api/diagnostic/tests?type=${tab}`);
      setTests(data.data || []);
    } catch { setTests([]); }
  };

  const loadPackages = async () => {
    try {
      const { data } = await api.get('/api/diagnostic/packages');
      setPackages(data.data || []);
    } catch { setPackages([]); }
  };

  const loadMyBookings = async () => {
    try {
      const { data } = await api.get('/api/diagnostic/my-bookings');
      setMyBookings(data.data || []);
    } catch { setMyBookings([]); }
  };

  const loadTimeSlots = async (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    try {
      const { data } = await api.get(`/api/diagnostic/time-slots?date=${date}`);
      setTimeSlots((data.data || []).filter(s => !s.isBooked));
    } catch { setTimeSlots([]); }
  };

  // Filtered tests
  const filteredTests = useMemo(() => {
    let result = tests;
    if (categoryFilter !== 'all') {
      result = result.filter(t => t.category === categoryFilter || t.subcategory === categoryFilter);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(s) || t.description.toLowerCase().includes(s));
    }
    return result;
  }, [tests, categoryFilter, search]);

  // Available categories
  const categories = useMemo(() => {
    const cats = new Set();
    tests.forEach(t => {
      cats.add(t.category);
      if (t.subcategory) cats.add(t.subcategory);
    });
    return ['all', ...Array.from(cats)];
  }, [tests]);

  // Cart helpers
  const isInCart = (testId) => cart.some(t => t.id === testId);
  const toggleCart = (test) => {
    if (isInCart(test.id)) {
      setCart(cart.filter(t => t.id !== test.id));
    } else {
      setCart([...cart, test]);
      setSelectedPackage(null);
    }
  };

  const selectPackage = (pkg) => {
    setSelectedPackage(pkg);
    setCart([]);
  };

  const cartTotal = useMemo(() => {
    if (selectedPackage) return selectedPackage.price;
    return cart.reduce((sum, t) => sum + t.price, 0);
  }, [cart, selectedPackage]);

  const itemCount = selectedPackage ? selectedPackage.tests.length : cart.length;

  const proceedToSchedule = () => {
    if (itemCount === 0) {
      toast.error('Please select at least one test or package');
      return;
    }
    setStep(2);
  };

  const bookDiagnostic = async () => {
    if (!selectedDate || !selectedSlot) {
      toast.error('Please select date and time');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        date: selectedDate,
        timeSlot: selectedSlot,
        notes,
        type: tab
      };
      if (selectedPackage) {
        payload.packageId = selectedPackage.id;
      } else {
        payload.testIds = cart.map(t => t.id);
      }

      const { data } = await api.post('/api/diagnostic/book', payload);
      toast.success(data.message || 'Tests booked successfully!');
      setStep(1);
      setCart([]);
      setSelectedPackage(null);
      setSelectedDate('');
      setSelectedSlot(null);
      setNotes('');
      loadMyBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (s) => {
    const m = { ordered: 'badge-info', 'sample-collected': 'badge-warning', processing: 'badge-primary', completed: 'badge-success', cancelled: 'badge-danger' };
    return m[s] || 'badge-gray';
  };

  return (
    <div className="diagnostic-page">
      <div className="page-header">
        <div>
          <h1>🏥 Book Lab Test & Radiology</h1>
          <p>Browse pathology tests, radiology scans, or choose a health package</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowBookings(!showBookings)}>
          {showBookings ? 'Browse Tests' : `My Bookings (${myBookings.length})`}
        </button>
      </div>

      {/* My Bookings View */}
      {showBookings ? (
        <div>
          <h3 style={{ marginBottom: '16px' }}>📋 My Diagnostic Bookings</h3>
          {myBookings.length === 0 ? (
            <div className="empty-state"><FiPackage style={{ fontSize: '48px' }} /><h3>No bookings yet</h3><p>Book a test to get started</p></div>
          ) : (
            <div className="flex flex-col gap-3">
              {myBookings.map(b => (
                <div key={b._id} className="card" style={{ padding: '16px' }}>
                  <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <strong>{b.testName}</strong>
                      <span className={`badge ${getStatusColor(b.status)}`} style={{ marginLeft: '8px' }}>{b.status}</span>
                      <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '4px' }}>
                        Booked: {format(new Date(b.orderedDate || b.createdAt), 'MMM d, yyyy')} • ₹{b.cost}
                      </p>
                      {b.status === 'completed' && b.results?.length > 0 && (
                        <div className="mt-2" style={{ padding: '10px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                          {b.results.map((r, i) => (
                            <div key={i} className="flex justify-between" style={{ fontSize: '13px', padding: '3px 0' }}>
                              <span>{r.parameter}</span>
                              <span style={{ fontWeight: 600, color: r.isAbnormal ? 'var(--danger)' : 'var(--success)' }}>
                                {r.value} {r.unit} {r.isAbnormal ? '⚠️' : '✓'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="diag-tabs">
            {tabConfig.map(t => (
              <button key={t.key} className={`diag-tab ${tab === t.key ? 'active' : ''}`}
                onClick={() => { setTab(t.key); setStep(1); setCart([]); setSelectedPackage(null); }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Step 1: Browse Tests */}
          {step === 1 && (
            <>
              {tab !== 'packages' ? (
                <>
                  {/* Search & Filter */}
                  <div className="diag-toolbar">
                    <div className="search-box">
                      <FiSearch />
                      <input placeholder="Search tests..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="filter-chips">
                      {categories.map(c => (
                        <button key={c} className={`filter-chip ${categoryFilter === c ? 'active' : ''}`}
                          onClick={() => setCategoryFilter(c)}>
                          {c === 'all' ? 'All' : (categoryLabels[c] || c)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Test Grid */}
                  <div className="test-grid">
                    {filteredTests.map(test => (
                      <div key={test.id} className={`test-card ${isInCart(test.id) ? 'selected' : ''}`}>
                        <div className="test-card-header">
                          <div>
                            <h4>{test.name}</h4>
                            <span className="test-category">{categoryLabels[test.subcategory || test.category] || test.category}</span>
                          </div>
                          <div className="test-price">₹{test.price}</div>
                        </div>
                        <p className="test-desc">{test.description}</p>
                        <div className="test-meta">
                          <span><FiClock /> {test.duration}</span>
                        </div>

                        {expandedTest === test.id && (
                          <div className="test-prep">
                            <strong>Preparation:</strong>
                            <p>{test.preparation}</p>
                          </div>
                        )}

                        <div className="test-card-footer">
                          <button className="info-btn" onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}>
                            <FiInfo /> {expandedTest === test.id ? 'Less' : 'Prep Info'}
                          </button>
                          <button className={`add-btn ${isInCart(test.id) ? 'remove' : ''}`} onClick={() => toggleCart(test)}>
                            {isInCart(test.id) ? <><FiX /> Remove</> : <><FiShoppingCart /> Add</>}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredTests.length === 0 && (
                    <div className="empty-state"><FiSearch style={{ fontSize: '48px' }} /><h3>No tests found</h3><p>Try a different search or category</p></div>
                  )}
                </>
              ) : (
                /* Packages */
                <div className="packages-grid">
                  {packages.map(pkg => (
                    <div key={pkg.id} className={`package-card ${selectedPackage?.id === pkg.id ? 'selected' : ''}`}
                      onClick={() => selectPackage(pkg)}>
                      <div className="package-header">
                        <h4>{pkg.name}</h4>
                        <div className="package-price">₹{pkg.price}</div>
                      </div>
                      <p className="package-desc">{pkg.description}</p>
                      <div className="package-includes">
                        <strong>Includes:</strong>
                        <p>{pkg.includes}</p>
                      </div>
                      <div className="package-test-count">{pkg.tests.length} tests included</div>
                      {selectedPackage?.id === pkg.id && (
                        <div className="package-selected-badge"><FiCheck /> Selected</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Cart / Proceed Bar */}
              {(cart.length > 0 || selectedPackage) && (
                <div className="cart-bar">
                  <div className="cart-info">
                    <FiShoppingCart />
                    <span>{selectedPackage ? selectedPackage.name : `${cart.length} test(s) selected`}</span>
                    <strong>Total: ₹{cartTotal}</strong>
                  </div>
                  <button className="btn btn-primary" onClick={proceedToSchedule}>
                    Proceed to Schedule →
                  </button>
                </div>
              )}
            </>
          )}

          {/* Step 2: Schedule */}
          {step === 2 && (
            <div>
              <button className="btn btn-secondary mb-4" onClick={() => setStep(1)}>← Back to Tests</button>

              <div className="card mb-4">
                <h3 className="card-title mb-3">📋 Selected Tests</h3>
                {selectedPackage ? (
                  <div className="selected-summary">
                    <div className="summary-item">
                      <span className="badge badge-primary">{selectedPackage.name}</span>
                      <span>{selectedPackage.tests.length} tests • ₹{selectedPackage.price}</span>
                    </div>
                  </div>
                ) : (
                  <div className="selected-summary">
                    {cart.map(t => (
                      <div key={t.id} className="summary-item">
                        <span>{t.name}</span>
                        <span>₹{t.price}</span>
                      </div>
                    ))}
                    <div className="summary-total">
                      <strong>Total</strong>
                      <strong>₹{cartTotal}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="card mb-4">
                <h3 className="card-title mb-3"><FiCalendar /> Select Date</h3>
                <input type="date" className="form-control" style={{ maxWidth: '260px' }}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  value={selectedDate} onChange={e => loadTimeSlots(e.target.value)} />

                {selectedDate && (
                  <div className="mt-3">
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}><FiClock /> Available Slots</label>
                    {timeSlots.length === 0 ? (
                      <p style={{ color: 'var(--gray-500)' }}>No slots available on this date. Please select another date.</p>
                    ) : (
                      <div className="slot-grid">
                        {timeSlots.map((s, i) => (
                          <button key={i} className={`slot ${selectedSlot?.startTime === s.startTime ? 'selected' : ''}`}
                            onClick={() => setSelectedSlot(s)}>{s.startTime}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedSlot && (
                <div className="card mb-4">
                  <h3 className="card-title mb-3">📝 Additional Notes (Optional)</h3>
                  <textarea className="form-control" rows={3} placeholder="Any special instructions, allergies, or current medications..."
                    value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              )}

              {selectedDate && selectedSlot && (
                <div className="card">
                  <h3 className="card-title mb-3">✅ Confirm Booking</h3>
                  <div style={{ padding: '16px', background: 'var(--gray-50)', borderRadius: '8px', marginBottom: '16px' }}>
                    <p><strong>Tests:</strong> {selectedPackage ? selectedPackage.name : cart.map(t => t.name).join(', ')}</p>
                    <p><strong>Date:</strong> {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}</p>
                    <p><strong>Time:</strong> {selectedSlot.startTime} - {selectedSlot.endTime}</p>
                    <p><strong>Total Cost:</strong> ₹{cartTotal}</p>
                    {notes && <p><strong>Notes:</strong> {notes}</p>}
                  </div>

                  {/* Preparation reminders */}
                  {!selectedPackage && cart.some(t => t.preparation) && (
                    <div className="prep-reminders mb-4">
                      <h4 style={{ marginBottom: '8px' }}>⚠️ Preparation Instructions</h4>
                      {cart.filter(t => t.preparation).map(t => (
                        <div key={t.id} className="prep-item">
                          <strong>{t.name}:</strong> {t.preparation}
                        </div>
                      ))}
                    </div>
                  )}

                  <button className="btn btn-primary btn-lg" onClick={bookDiagnostic} disabled={loading}>
                    {loading ? 'Booking...' : '✓ Confirm Booking'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BookDiagnostic;
