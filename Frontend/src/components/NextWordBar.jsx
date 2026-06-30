export default function NextWordBar({ words, onSelect }) {
  if (!words || words.length === 0) return null;
 
  return (
    <div className="next-word-bar">
      <div className="next-word-bar-label">Next word suggestions</div>
      <div className="next-word-chips-row">
        {words.map((w, i) => (
          <button
            key={i}
            className={`next-word-chip next-word-chip--${(i % 5) + 1}`}
            onClick={() => onSelect(w)}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}
 