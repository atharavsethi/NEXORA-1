import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CATEGORIES = [
  'General Medicine', 'Nutrition & Diet', 'Mental Health', 'Pediatrics',
  'Cardiology', 'Dermatology', "Women's Health", 'Emergency & First Aid',
  'Dental', 'Other'
];

export default function AskQuestion() {
  const [formData, setFormData] = useState({ title: '', description: '', category: 'General Medicine' });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('category', formData.category);
      if (image) data.append('image', image);

      const res = await axios.post('/api/questions', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      navigate(`/forum/${res.data._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper container" style={{ padding: '40px 20px', maxWidth: '700px' }}>
      <div className="glass-card" style={{ padding: '40px' }}>
        <h2 style={{ marginBottom: '10px' }}>Ask a Health Question</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
          Your question will be answered by verified medical professionals. Do not share personally identifiable information.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input type="text" className="form-input" required 
              placeholder="e.g. What are the symptoms of Vitamin D deficiency?"
              value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select className="form-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Detailed Description</label>
            <textarea className="form-input" required 
              placeholder="Provide context, duration of symptoms, age, etc. Avoid identifying details."
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          <div className="form-group">
            <label>Optional Image (Lab report, rash, etc. NO faces)</label>
            <input type="file" className="form-input" accept="image/*" onChange={e => setImage(e.target.files[0])} />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '20px' }} disabled={loading}>
            {loading ? 'Posting...' : 'Post Question'}
          </button>
        </form>
      </div>
    </div>
  );
}
