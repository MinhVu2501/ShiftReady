import { Link } from "react-router-dom";

export default function SessionCard({ session }) {
  const ended = !!session.ended_at;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex items-center justify-between gap-3">
      <div className="space-y-1">
        <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
          {session.mode}
        </div>
        <div className="text-slate-600 text-sm">
          {new Date(session.created_at).toLocaleString()}
        </div>
        <div className="text-slate-700 text-sm">
          {session.specialty} • {session.experience_level}
        </div>
      </div>
      <Link
        className="px-4 py-2 rounded-2xl border border-slate-300 text-slate-800 hover:bg-slate-50"
        to={`/interview/${session.id}${ended ? "/report" : ""}`}
      >
        {ended ? "View Report" : "Resume"}
      </Link>
    </div>
  );
}

