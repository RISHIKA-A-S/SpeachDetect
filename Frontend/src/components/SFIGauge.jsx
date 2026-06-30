export default function SFIGauge({ sfi, severity }) {
  if (sfi == null) return null;
  const color = sfi >= 75 ? "#22c55e" : sfi >= 55 ? "#f59e0b" : sfi >= 35 ? "#f97316" : "#ef4444";
  const angle = (sfi / 100) * 180 - 90;   // -90° (0) to +90° (100)

  return (
    <div className="panel sfi-gauge">
      <h3>Fluency Index (SFI)</h3>
      <svg viewBox="0 0 200 110" width="200">
        <path d="M10 100 A90 90 0 0 1 190 100" fill="none" stroke="#e5e7eb" strokeWidth="16" strokeLinecap="round"/>
        <path
          d="M10 100 A90 90 0 0 1 190 100"
          fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${(sfi / 100) * 283} 283`}
        />
        <line
          x1="100" y1="100"
          x2={100 + 70 * Math.cos((angle * Math.PI) / 180)}
          y2={100 + 70 * Math.sin((angle * Math.PI) / 180)}
          stroke="#374151" strokeWidth="2" strokeLinecap="round"
        />
        <text x="100" y="95" textAnchor="middle" fontSize="22" fontWeight="bold" fill={color}>
          {sfi}
        </text>
        <text x="100" y="110" textAnchor="middle" fontSize="11" fill="#6b7280">
          {severity}
        </text>
      </svg>
    </div>
  );
}