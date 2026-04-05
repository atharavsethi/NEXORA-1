import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function ConsultationBooking() {
  const { doctorId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  
  const [status, setStatus] = useState('select_slot'); // select_slot | confirm_payment | success
  const [consultationId, setConsultationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [doctorId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docRes, slotsRes] = await Promise.all([
        axios.get(`/api/doctors/${doctorId}`),
        axios.get(`/api/slots/doctor/${doctorId}`)
      ]);
      setDoctor(docRes.data);
      setSlots(slotsRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load consultation details.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookSlot = async () => {
    if (!selectedSlot) return;
    setProcessing(true);
    setError('');
    try {
      const { data } = await axios.post('/api/consultations', {
        doctorId,
        slotId: selectedSlot._id,
        symptoms
      });
      setConsultationId(data._id);
      setStatus('confirm_payment');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book slot.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSimulatePayment = async () => {
    setProcessing(true);
    setError('');
    try {
      await axios.post(`/api/consultations/${consultationId}/pay`);
      setStatus('success');
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="spinner" style={{ marginTop: '200px' }} />;
  if (!doctor) return <div className="page-wrapper container" style={{ textAlign: 'center', paddingTop: '120px' }}><h3>Doctor not found</h3></div>;

  return (
    <div className="page-wrapper container" style={{ maxWidth: '800px', paddingBottom: '60px' }}>
      <Link to={`/doctors/${doctorId}`} style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
        ← Back to {doctor.name}'s Profile
      </Link>

      <div className="glass-card" style={{ padding: '36px' }}>
        <h2 style={{ marginBottom: '8px' }}>Book Consultation</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #4facfe)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.2rem' }}>
            {doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h4 style={{ margin: 0 }}>{doctor.name}</h4>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{doctor.specialty} • {doctor.institution}</p>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

        {status === 'select_slot' && (
          <div>
            <h4 style={{ marginBottom: '16px' }}>1. Select Available Slot</h4>
            {slots.length === 0 ? (
              <div className="empty-state">No available slots at the moment. Please check back later.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
                {slots.map(slot => (
                  <div 
                    key={slot._id}
                    onClick={() => setSelectedSlot(slot)}
                    style={{ 
                      padding: '16px', border: `2px solid ${selectedSlot?._id === slot._id ? 'var(--primary)' : 'var(--card-border)'}`,
                      borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      background: selectedSlot?._id === slot._id ? 'rgba(30, 94, 255, 0.05)' : 'var(--white)',
                      transition: 'all 0.2s', minWidth: '200px'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--secondary)', marginBottom: '4px' }}>{slot.day}</div>
                    <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '8px' }}>{slot.startTime} - {slot.endTime}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{slot.duration} mins</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>₹{slot.fee}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedSlot && (
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label>Summary of your symptoms (Optional)</label>
                <textarea 
                  className="form-input" 
                  placeholder="Briefly describe why you are booking this consultation..."
                  value={symptoms} 
                  onChange={e => setSymptoms(e.target.value)}
                  style={{ minHeight: '100px' }}
                />
              </div>
            )}

            <button 
              className="btn btn-primary btn-lg" 
              onClick={handleBookSlot} 
              disabled={!selectedSlot || processing}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {processing ? 'Reserving...' : 'Proceed to Payment'}
            </button>
          </div>
        )}

        {status === 'confirm_payment' && selectedSlot && (
          <div>
            <div style={{ background: 'var(--bg-light)', padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '16px' }}>Payment Summary</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Consultation Fee</span>
                <span style={{ fontWeight: 600 }}>₹{selectedSlot.fee}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Platform Fee</span>
                <span style={{ fontWeight: 600 }}>₹0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>Total to Pay</span>
                <span style={{ fontWeight: 800, color: 'var(--accent)' }}>₹{selectedSlot.fee}</span>
              </div>
            </div>

            <div className="alert alert-info" style={{ marginBottom: '24px' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Test Mode Payment</div>
              <div style={{ fontSize: '0.9rem' }}>This platform is a prototype. No real money will be deducted. Click below to simulate a successful payment.</div>
            </div>

            <button 
              className="btn btn-primary btn-lg" 
              onClick={handleSimulatePayment} 
              disabled={processing}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {processing ? 'Processing Payment...' : `Pay ₹${selectedSlot.fee} Now`}
            </button>
          </div>
        )}

        {status === 'success' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '4rem', color: 'var(--success)', marginBottom: '16px' }}>✓</div>
            <h3 style={{ marginBottom: '16px' }}>Booking Confirmed!</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
              Your payment was successful and the consultation request has been sent to Dr. {doctor.name.split(' ').slice(-1)}. 
              You will be notified once the doctor accepts the appointment and shares the meet link.
            </p>
            <Link to="/my-consultations" className="btn btn-primary">
              View My Consultations
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
