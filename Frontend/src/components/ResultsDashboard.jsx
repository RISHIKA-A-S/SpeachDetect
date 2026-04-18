import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";

const ResultsDashboard = () => {
  const [results, setResults] = useState([]);

  useEffect(() => {
    axiosInstance.get("/results")
      .then(res => setResults(res.data.results))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h2>Your Speech Results</h2>
      {results.map((r, idx) => (
        <div key={idx} className="result-card">
          <p><strong>Speech:</strong> {r.speech}</p>
          <p><strong>Stutter Types:</strong> {r.stutter_types.join(", ")}</p>
          <p><strong>Fluency Score:</strong> {r.fluency_score}</p>
          <p><strong>Date:</strong> {new Date(r.timestamp).toLocaleString()}</p>
          <hr />
        </div>
      ))}
    </div>
  );
};

export default ResultsDashboard;
