import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api.js";

export default function InterviewReport() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [feedbackForm, setFeedbackForm] = useState({
    feltReal: 3,
    helpfulFeedback: 3,
    scoreFair: 3,
    issues: [],
    wouldUseAgain: "maybe",
    note: "",
  });
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);

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

  const summary = (() => {
    const s = data.session_summary;
    if (s && typeof s === "object") return s;
    // Backward compatibility: if summary is a string, wrap it
    if (typeof s === "string") {
      return {
        overall: s,
        strengths: [],
        improvements: [],
        next_focus: "",
      };
    }
    return {
      overall: "Keep practicing concise, action-outcome answers.",
      strengths: [],
      improvements: [],
      next_focus: "",
    };
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
          <p className="text-slate-800 mb-2">{summary.overall}</p>
          {summary.strengths?.length ? (
            <div className="mb-2">
              <strong className="text-slate-900">What you did well</strong>
              <ul className="list-disc ml-5 text-slate-700 space-y-1">
                {summary.strengths.slice(0, 3).map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {summary.improvements?.length ? (
            <div className="mb-2">
              <strong className="text-slate-900">What to improve</strong>
              <ul className="list-disc ml-5 text-slate-700 space-y-1">
                {summary.improvements.slice(0, 3).map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {summary.next_focus ? (
            <div className="text-slate-800">
              <strong className="text-slate-900">Next practice focus:</strong> {summary.next_focus}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Send feedback (30 seconds)</h3>
          {feedbackSent && <span className="text-sm text-green-700">Thanks for your feedback!</span>}
        </div>
        {feedbackError && <div className="text-sm text-red-600">{feedbackError}</div>}
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setFeedbackError("");
            setFeedbackLoading(true);
            try {
              await api.post("/api/feedback", {
                sessionId: data.session.id,
                feltReal: Number(feedbackForm.feltReal),
                helpfulFeedback: Number(feedbackForm.helpfulFeedback),
                scoreFair: Number(feedbackForm.scoreFair),
                issues: feedbackForm.issues,
                wouldUseAgain: feedbackForm.wouldUseAgain,
                note: feedbackForm.note,
              });
              setFeedbackSent(true);
            } catch (err) {
              setFeedbackError(err.message);
            } finally {
              setFeedbackLoading(false);
            }
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: "feltReal", label: "How realistic (1-5)?" },
              { key: "helpfulFeedback", label: "Feedback helpful (1-5)?" },
              { key: "scoreFair", label: "Scoring fair (1-5)?" },
            ].map((f) => (
              <label key={f.key} className="text-sm font-semibold text-slate-700 space-y-1">
                {f.label}
                <select
                  className="w-full rounded-lg border border-slate-300 px-2 py-2"
                  value={feedbackForm[f.key]}
                  onChange={(e) =>
                    setFeedbackForm({ ...feedbackForm, [f.key]: Number(e.target.value) })
                  }
                  required
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">Issues (optional)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
              {[
                "question_mismatch",
                "scoring_mismatch",
                "too_generic",
                "missed_clinical_points",
                "too_long",
                "ui_confusing",
                "slow",
                "other",
              ].map((issue) => (
                <label key={issue} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={feedbackForm.issues.includes(issue)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...feedbackForm.issues, issue]
                        : feedbackForm.issues.filter((i) => i !== issue);
                      setFeedbackForm({ ...feedbackForm, issues: next });
                    }}
                  />
                  <span>{issue.replace(/_/g, " ")}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-700">Would use again?</div>
            <select
              className="w-full rounded-lg border border-slate-300 px-2 py-2"
              value={feedbackForm.wouldUseAgain}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, wouldUseAgain: e.target.value })}
              required
            >
              <option value="yes">yes</option>
              <option value="maybe">maybe</option>
              <option value="no">no</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-700">Notes (optional)</div>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={feedbackForm.note}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, note: e.target.value })}
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={feedbackLoading || feedbackSent}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
          >
            {feedbackSent ? "Sent" : feedbackLoading ? "Sending..." : "Submit feedback"}
          </button>
        </form>
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

