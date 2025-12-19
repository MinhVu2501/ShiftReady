import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api.js";

export default function InterviewReport() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/api/interviews/${id}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <div className="muted">{error}</div>;
  if (!data) return <div>Loading...</div>;

  const answeredTurns = data.turns.filter((t) => !t.is_seed_turn);
  const avg = data.average_scores || { clarity: 0, confidence: 0, clinical_reasoning: 0 };
  const overallAvg = Math.round(
    ((avg.clarity + avg.confidence + avg.clinical_reasoning) / 3) * 10
  ) / 10;
  let badge = { text: "Needs Improvement", className: "bg-red-50 text-red-700 border-red-200" };
  if (overallAvg >= 7) badge = { text: "Strong", className: "bg-green-50 text-green-700 border-green-200" };
  else if (overallAvg >= 4) badge = { text: "Developing", className: "bg-yellow-50 text-yellow-800 border-yellow-200" };

  const fallbackSummary = (() => {
    if (data.session_summary) return data.session_summary;
    const strengthsAll = answeredTurns.flatMap((t) => t.ai_feedback_json?.strengths || []);
    const improvementsAll = answeredTurns.flatMap((t) => t.ai_feedback_json?.improvements || []);
    const uniq = (arr) => Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean))).slice(0, 3);
    const topStrengths = uniq(strengthsAll);
    const topImprovements = uniq(improvementsAll);
    const parts = [];
    if (topStrengths.length) parts.push(`You did well on ${topStrengths.join(", ")}.`);
    if (topImprovements.length) parts.push(`Focus on ${topImprovements.join(", ")} next.`);
    if (!parts.length) return "Keep practicing concise, action-outcome answers.";
    return parts.join(" ");
  })();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-3">
        <h2 className="text-2xl font-bold text-slate-900">Session report</h2>
        <div className="text-slate-600">
          {data.session.specialty} • {data.session.experience_level}
        </div>
        <div className="text-slate-600">
          {new Date(data.session.created_at).toLocaleString()}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
            Clarity {avg.clarity}
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
            Confidence {avg.confidence}
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
            Clinical reasoning {avg.clinical_reasoning}
          </span>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${badge.className}`}>
            {badge.text}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800">
          <h4 className="text-lg font-semibold text-slate-900 mb-1">Summary</h4>
          <p>{data.session_summary || fallbackSummary}</p>
        </div>
      </div>

      {answeredTurns.map((t) => (
        <div key={t.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <div className="text-lg font-semibold text-slate-900">{t.question}</div>
          <div>
            <strong className="text-slate-900">Your answer</strong>
            <p className="text-slate-700 mt-1">{t.user_answer}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <strong className="text-slate-900">Strengths</strong>
              <ul className="list-disc ml-5 text-slate-700 space-y-1">
                {(t.ai_feedback_json?.strengths || []).map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong className="text-slate-900">Improvements</strong>
              <ul className="list-disc ml-5 text-slate-700 space-y-1">
                {(t.ai_feedback_json?.improvements || []).map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-slate-800">
            <strong className="text-slate-900">Improved answer</strong>
            <p className="text-slate-800 mt-1">{t.ai_improved_answer}</p>
          </div>
          <div className="text-sm text-slate-600">
            Scores: clarity {t.scores_json?.clarity}, confidence {t.scores_json?.confidence}, clinical reasoning {t.scores_json?.clinical_reasoning}
          </div>
        </div>
      ))}
    </div>
  );
}

