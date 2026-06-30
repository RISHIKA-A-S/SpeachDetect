export default function TherapyCard({ therapy }) {
  if (!therapy) return null;
  return (
    <div className="panel therapy-card">
      <h3>Recommended Exercise</h3>
      <h4>{therapy.exercise}</h4>
      <p>{therapy.description}</p>
      <p className="meta">
        ⏱ {therapy.duration_min} min &nbsp;|&nbsp; 📚 {therapy.evidence}
      </p>
      <p className="meta">For: {therapy.stutter_class} / {therapy.severity}</p>
    </div>
  );
}