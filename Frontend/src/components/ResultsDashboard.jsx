import React, { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

// Register chart components
ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const ResultsDashboard = () => {
  const [results, setResults] = useState([]);

  const fetchResults = async () => {
    try {
      const res = await axiosInstance.get("/results");
      setResults(res.data.results);
    } catch (err) {
      console.error("Error fetching results:", err);
    }
  };

  useEffect(() => {
    fetchResults();

    // ✅ Auto-refresh every 10 seconds
    const interval = setInterval(fetchResults, 10000);
    return () => clearInterval(interval);
  }, []);

  // Prepare chart data
  const chartData = {
    labels: results.map(r =>
      new Date(r.timestamp).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short"
      })
    ),
    datasets: [
      {
        label: "Fluency Score",
        data: results.map(r => r.fluency_score),
        borderColor: "rgba(75,192,192,1)",
        backgroundColor: "rgba(75,192,192,0.2)",
        tension: 0.3,
        fill: true,
        pointRadius: 4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Fluency Progress Over Time" }
    },
    scales: {
      y: {
        min: 0,
        max: 1,
        ticks: { stepSize: 0.1 }
      }
    }
  };

  return (
    <div style={{ width: "80%", margin: "auto" }}>
      <h2>Your Speech Results</h2>
      <Line data={chartData} options={chartOptions} />

      <button onClick={fetchResults} style={{ marginTop: "1rem" }}>
        Refresh Results
      </button>

      <div style={{ marginTop: "2rem" }}>
        {results.map((r, idx) => (
          <div key={idx} className="result-card">
            <p><strong>Date:</strong> {new Date(r.timestamp).toLocaleString()}</p>
            <p><strong>Speech:</strong> {r.speech}</p>
            <p><strong>Stutter Types:</strong> {r.stutter_types.join(", ")}</p>
            <p><strong>Fluency Score:</strong> {r.fluency_score}</p>
            <hr />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsDashboard;
