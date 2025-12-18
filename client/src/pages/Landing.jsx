import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Landing() {
  const { user } = useAuth();
  const ctaTarget = user ? "/interview/setup" : "/register";

  return (
    <div className="grid gap-8 lg:grid-cols-2 items-start">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-blue-700">
            AI-powered interview practice for nurses and healthcare professionals
          </p>
          <h1 className="text-4xl font-bold text-slate-900">
            Structured prep for students, new grads, and experienced clinicians.
          </h1>
          <p className="text-slate-600 text-lg">
            Structured clinical scenarios, rubric-based scoring, and targeted feedback.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to={ctaTarget}
            className="px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
          >
            Start free quick session
          </Link>
          <Link
            to="/pricing"
            className="px-4 py-3 rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-50"
          >
            See pricing
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-900">Quick sessions</p>
            <p className="text-slate-600">5-question drills for daily practice.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-900">Full sessions</p>
            <p className="text-slate-600">12-question prep for full interviews.</p>
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <h3 className="text-xl font-semibold text-slate-900">How it works</h3>
        <ol className="space-y-2 text-slate-700 list-decimal list-inside">
          <li>Pick your specialty and experience level.</li>
          <li>Choose quick (5 Q) or full (12 Q) mode.</li>
          <li>Answer, get scored feedback, and see improved responses.</li>
          <li>Save reports to track progress.</li>
        </ol>
      </div>
    </div>
  );
}

