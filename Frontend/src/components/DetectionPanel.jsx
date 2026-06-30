export default function DetectionPanel({ result, audioUrl }) {
  if (!result) return null;
  const { predicted_class, confidence, class_probs, stutter_detected, reason } = result;

  return (
    <div className="panel">
      <h3>Detection Result</h3>
      <p><strong>Class:</strong> {predicted_class}</p>
      <p><strong>Confidence:</strong> {(confidence * 100).toFixed(1)}%</p>
      <p><strong>Stutter detected:</strong> {stutter_detected ? "Yes" : "No"}</p>
      {reason && <p><strong>Reason:</strong> {reason}</p>}
      <div className="prob-bars">
        {Object.entries(class_probs || {}).map(([cls, p]) => (
          <div key={cls} className="bar-row">
            <span>{cls}</span>
            <div className="bar" style={{ width: `${(p * 100).toFixed(0)}%` }} />
            <span>{(p * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
      {audioUrl && <audio controls src={audioUrl} />}
    </div>
  );
}