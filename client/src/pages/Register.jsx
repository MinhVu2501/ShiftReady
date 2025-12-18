import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    specialty: "",
    experience_level: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post("/api/auth/register", form);
      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 500, margin: "0 auto" }}>
      <h2>Create account</h2>
      {error && <div className="muted">{error}</div>}
      <form className="stack" onSubmit={handleSubmit}>
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label>Password (min 6 chars)</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <div className="two-col">
          <div className="field">
            <label>Specialty</label>
            <input
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              placeholder="e.g., Cardiology"
              required
            />
          </div>
          <div className="field">
            <label>Experience level</label>
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
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Creating..." : "Sign up"}
        </button>
      </form>
      <p className="muted">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

