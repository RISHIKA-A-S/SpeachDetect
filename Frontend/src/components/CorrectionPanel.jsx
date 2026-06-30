export default function CorrectionPanel({ original, corrected }) {
  if (!original || !corrected) return null;

  function lcs(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () =>
      new Array(b.length + 1).fill(0)
    );
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i][j] =
          a[i - 1].toLowerCase() === b[j - 1].toLowerCase()
            ? dp[i - 1][j - 1] + 1
            : Math.max(dp[i - 1][j], dp[i][j - 1]);

    const ops = [];
    let i = a.length, j = b.length;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i-1].toLowerCase() === b[j-1].toLowerCase()) {
        ops.unshift({ t: "eq",  w: a[i - 1] }); i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        ops.unshift({ t: "add", w: b[j - 1] }); j--;
      } else {
        ops.unshift({ t: "del", w: a[i - 1] }); i--;
      }
    }
    return ops;
  }

  const aTokens = original.trim().split(/\s+/).filter(Boolean);
  const bTokens = corrected.trim().split(/\s+/).filter(Boolean);
  const ops      = lcs(aTokens, bTokens);

  const removed   = ops.filter(o => o.t === "del").length;
  const added     = ops.filter(o => o.t === "add").length;
  const unchanged = ops.filter(o => o.t === "eq").length;
  const identical = removed === 0 && added === 0;

  return (
    <div className="panel">
      <h3>Disfluency correction</h3>

      {identical ? (
        <div className="correction-notice">
          ℹ️ No disfluencies found in the transcript. If you stuttered and this
          looks wrong, the speech-to-text engine may have auto-corrected your
          audio before analysis reached this stage.
        </div>
      ) : (
        <>
          <div className="correction-meta">
            <span className="diff-stat removed">{removed} removed</span>
            <span className="diff-stat added">{added} added</span>
            <span className="diff-stat unchanged">{unchanged} unchanged</span>
          </div>

          <div className="diff-line">
            {ops.map((op, i) =>
              op.t === "del" ? (
                <span key={i} className="diff-removed">{op.w} </span>
              ) : op.t === "add" ? (
                <span key={i} className="diff-added">{op.w} </span>
              ) : (
                <span key={i} className="diff-eq">{op.w} </span>
              )
            )}
          </div>
        </>
      )}

      <div className="correction-originals">
        <div className="correction-row">
          <span className="correction-label">Original</span>
          <span className="correction-text">{original}</span>
        </div>
        <div className="correction-row">
          <span className="correction-label">Corrected</span>
          <span className="correction-text corrected-text">{corrected}</span>
        </div>
      </div>
    </div>
  );
}