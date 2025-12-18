import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    specialty: "",
    experience_level: "",
    mode: "quick",
    hospital_name: "",
    job_text: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post("/interviews/start", form);
      sessionStorage.setItem(
        `session-${data.session.id}-question`,
        data.question
      );
      navigate(`/interview/${data.session.id}`, {
        state: { question: data.question },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Interview setup</h2>
      {error && <div className="muted">{error}</div>}
      <form className="stack" onSubmit={handleSubmit}>
        <div className="two-col">
          <div className="field">
            <label>Specialty (required)</label>
            <input
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Experience level (required)</label>
            <select
              value={form.experience_level}
              onChange={(e) =>
                setForm({ ...form, experience_level: e.target.value })
              }
              required
            >
              <option value="">Select</option>
              <option value="student">Student</option>
              <option value="new_grad">New Grad</option>
              <option value="1-3_years">1-3 years</option>
              <option value="3_plus_years">3+ years</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Mode</label>
          <select
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value })}
          >
            <option value="quick">Quick (5 questions)</option>
            <option value="full">Full (12 questions)</option>
          </select>
        </div>
        <div className="field">
          <label>Hospital (optional)</label>
          <input
            value={form.hospital_name}
            onChange={(e) =>
              setForm({ ...form, hospital_name: e.target.value })
            }
          />
        </div>
        <div className="field">
          <label>Job posting (optional)</label>
          <textarea
            value={form.job_text}
            onChange={(e) => setForm({ ...form, job_text: e.target.value })}
            placeholder="Paste details to tailor your interview."
          />
        </div>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Starting..." : "Start interview"}
        </button>
      </form>
    </div>
  );
}

