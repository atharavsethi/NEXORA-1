import { Link } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';

const CATEGORY_ICONS = {
  'General Medicine': '🩺', 'Nutrition & Diet': '🥗', 'Mental Health': '🧠',
  'Pediatrics': '👶', 'Cardiology': '❤️', 'Dermatology': '🔬',
  "Women's Health": '🌸', 'Emergency & First Aid': '🚨', 'Dental': '🦷', 'Other': '💬'
};

export default function QuestionCard({ question, showStatus = true }) {
  const icon = CATEGORY_ICONS[question.category] || '💬';
  const date = new Date(question.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  return (
    <Link to={`/forum/${question._id}`} style={{ textDecoration: 'none' }}>
      <div className="question-card glass-card">
        <div className="qcard-header">
          <span className="category-badge">{icon} {question.category}</span>
          {showStatus && (
            <span className={`status-badge status-${question.status}`}>
              {question.status === 'pending' ? '⏳ Pending' :
               question.status === 'answered' ? '✔ Answered' : '🔒 Closed'}
            </span>
          )}
        </div>

        <h3 className="qcard-title">{question.title}</h3>
        <p className="qcard-desc">{question.description?.substring(0, 120)}...</p>

        <div className="qcard-footer">
          <div className="qcard-author">
            <div className="author-avatar">{question.userId?.name?.[0] || '?'}</div>
            <div>
              <span className="author-name">{question.userId?.name || 'Anonymous'}</span>
              <span className="author-date">{date}</span>
            </div>
          </div>
          <div className="qcard-meta">
            <span title="Views">👁 {question.views || 0}</span>
            <span title="Answers">💬 {question.answersCount || 0}</span>
            <span title="Upvotes">▲ {question.upvotes?.length || 0}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
