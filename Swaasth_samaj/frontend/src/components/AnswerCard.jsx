import VerifiedBadge from './VerifiedBadge';

export default function AnswerCard({ answer }) {
  const date = new Date(answer.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
  const doctor = answer.doctorId;

  return (
    <div className="answer-card glass-card">
      <div className="acard-header">
        <div className="acard-author">
          <div className="author-avatar large">{doctor?.name?.[0] || 'D'}</div>
          <div>
            <div className="author-name-row">
              <span className="author-name">{doctor?.name || 'Doctor'}</span>
              {doctor?.verified && <VerifiedBadge role={doctor.role} />}
            </div>
            {doctor?.specialty && (
              <span className="doctor-specialty">🏥 {doctor.specialty}</span>
            )}
            {doctor?.institution && (
              <span className="doctor-institution">🎓 {doctor.institution}</span>
            )}
          </div>
        </div>
        <div className="acard-badges">
          <span className="moderation-badge">✔ Moderation Verified</span>
          <span className="answer-date">{date}</span>
        </div>
      </div>

      <div className="acard-body">
        <p>{answer.text}</p>
      </div>

      <div className="acard-footer">
        <span className="upvote-count">▲ {answer.upvotes?.length || 0} helpful</span>
        <div className="disclaimer-small">
          ⚠ This answer is for guidance only. Always consult a licensed physician.
        </div>
      </div>
    </div>
  );
}
