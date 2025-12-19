import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import SessionCard from "../components/SessionCard.jsx";

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/interviews")
      .then((data) => setSessions(data.sessions))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Ready to practice?</h2>
          <p className="text-slate-600">Start a quick or full interview anytime.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/interview/setup"
            className="px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            Start mock interview
          </Link>
          <Link
            to="/pricing"
            className="px-4 py-3 rounded-2xl border border-slate-300 text-slate-800 hover:bg-slate-50"
          >
            Upgrade
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Past sessions</h3>
        </div>
        {loading && <div className="text-slate-600">Loading...</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {!loading && sessions.length === 0 && (
          <div className="text-slate-600">No sessions yet.</div>
        )}
        <div className="grid gap-3">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

