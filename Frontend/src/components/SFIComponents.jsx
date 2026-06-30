export default function SFIComponents({ components }) {
  if (!components) return null;

  return (
    <div className="panel">
      <h3>SFI Components</h3>

      <div className="sfi-components">
        <div className="sfi-item">
          <span>Stutter Rate (SR)</span>
          <strong>{components.SR_norm}</strong>
        </div>

        <div className="sfi-item">
          <span>Stutter Frequency (SF)</span>
          <strong>{components.SF_norm}</strong>
        </div>

        <div className="sfi-item">
          <span>Prolongation Duration (PD)</span>
          <strong>{components.PD_norm}</strong>
        </div>

        <div className="sfi-item">
          <span>Phrase Accuracy (PA)</span>
          <strong>{components.PA_norm}</strong>
        </div>
      </div>
    </div>
  );
}
