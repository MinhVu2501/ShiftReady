import { useState } from "react";
import { api } from "../lib/api.js";

export default function Pricing() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const startCheckout = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.post("/billing/checkout", {});
      setUrl(data.checkoutUrl);
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Pricing</h2>
      <p className="muted">Free trial: 1 quick session. Upgrade for unlimited practice.</p>
      <div className="grid">
        <div className="card">
          <h3>Free</h3>
          <p className="muted">One quick interview (5 questions)</p>
          <button className="btn secondary" disabled>
            Current
          </button>
        </div>
        <div className="card">
          <h3>Pro</h3>
          <p className="muted">Unlimited quick + full interviews</p>
          <button className="btn" onClick={startCheckout} disabled={loading}>
            {loading ? "Redirecting..." : "Upgrade"}
          </button>
          {error && <div className="muted">{error}</div>}
          {url && <div className="muted">Checkout opened...</div>}
        </div>
      </div>
    </div>
  );
}

