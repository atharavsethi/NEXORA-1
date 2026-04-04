export default function VerifiedBadge({ role }) {
  if (role === 'doctor') {
    return (
      <span className="verified-badge verified-doctor">
        ✔ Verified Doctor
      </span>
    );
  }
  if (role === 'student') {
    return (
      <span className="verified-badge verified-student">
        🎓 Medical Student
      </span>
    );
  }
  if (role === 'admin') {
    return (
      <span className="verified-badge verified-doctor">
        ⚙ Admin
      </span>
    );
  }
  return null;
}
