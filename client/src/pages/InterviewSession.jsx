import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api.js";

export default function InterviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionMeta, setSessionMeta] = useState(null);
  const [question, setQuestion] = useState(
    location.state?.question ||
      sessionStorage.getItem(`session-${id}-question`) ||
      ""
  );
  const [nextPreview, setNextPreview] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [answeredCount, setAnsweredCount] = useState(0);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    // Hydrate session state from server so resume works after navigation/refresh
    api
      .get(`/interviews/${id}`)
      .then((data) => {
        setSessionMeta(data.session);
        if (data.session?.ended_at) {
          navigate(`/interview/${id}/report`, { replace: true });
          return;
        }

        const answeredTurns = data.turns.filter((t) => t.user_answer !== null);
        const pendingTurn = data.turns.find((t) => t.user_answer === null);

        setAnsweredCount(answeredTurns.length);

        // Restore latest feedback from last answered turn
        const lastAnswered = answeredTurns[answeredTurns.length - 1];
        if (lastAnswered) {
          setFeedback({
            scores: lastAnswered.scores_json,
            strengths: lastAnswered.ai_feedback_json?.strengths || [],
            improvements: lastAnswered.ai_feedback_json?.improvements || [],
            improved_answer: lastAnswered.ai_improved_answer,
          });
        }

        // Restore the next question to answer from pending turn if present
        if (pendingTurn) {
          setQuestion(pendingTurn.question);
          setNextPreview(""); // backend does not persist preview; hide until next submission
          sessionStorage.setItem(`session-${id}-question`, pendingTurn.question);
        } else if (!pendingTurn && lastAnswered) {
          // No pending turn and not ended => force redirect to report to avoid being stuck
          navigate(`/interview/${id}/report`, { replace: true });
        }
      })
      .catch((err) => {
        if (!question) setError(err.message);
      })
      .finally(() => {
        setHydrating(false);
      });
  }, [id, question, navigate]);

  const totalQuestions =
    sessionMeta?.mode === "full" ? 12 : sessionMeta?.mode === "quick" ? 5 : 5;
  const hasPending = Boolean(question);
  const currentIndex = Math.min(answeredCount + (hasPending ? 1 : 0), totalQuestions);
  const progressPercent = Math.round((currentIndex / totalQuestions) * 100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.post(`/interviews/${id}/answer`, {
        question,
        answer,
      });

      if (data.status === "completed") {
        sessionStorage.removeItem(`session-${id}-question`);
        setFeedback(data.feedback);
        navigate(`/interview/${id}/report`, { replace: true });
        return;
      }

      if (data.status === "in_progress") {
        setFeedback(data.feedback);
        setQuestion(data.question);
        setNextPreview(data.next_question_preview || "");
        sessionStorage.setItem(`session-${id}-question`, data.question);
        setAnswer("");
        setAnsweredCount((c) => c + 1);
        return;
      }

      setError("Unexpected response from server.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Interview in progress</h3>
          <div className="text-sm text-slate-600">
            Question {currentIndex} of {totalQuestions}
          </div>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full">
          <div
            className="h-2 bg-blue-600 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="space-y-1">
          <div className="text-sm font-semibold text-slate-600">Question</div>
          <div className="text-lg font-semibold text-slate-900">{hydrating ? "Loading..." : question}</div>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="text-sm font-semibold text-slate-600">Your response</div>
          <textarea
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 min-h-[140px] text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer..."
            required
          />
          <button
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={hydrating || loading || !answer.trim()}
          >
            {loading && (
              <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? "Submitting..." : "Submit answer"}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-slate-900">AI Feedback</h4>
          {feedback && (
            <div className="flex flex-wrap gap-2">
              {["clarity", "confidence", "clinical_reasoning"].map((k) => {
                const v = feedback.scores?.[k] ?? 0;
                const color =
                  v >= 7
                    ? "bg-green-100 text-green-800"
                    : v >= 5
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800";
                const label =
                  k === "clinical_reasoning" ? "Clinical reasoning" : k.charAt(0).toUpperCase() + k.slice(1);
                return (
                  <span
                    key={k}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${color}`}
                  >
                    {label} {v}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {!feedback && (
          <div className="space-y-3">
            <div className="animate-pulse bg-slate-200 rounded h-4 w-1/2" />
            <div className="animate-pulse bg-slate-200 rounded h-4 w-full" />
            <div className="animate-pulse bg-slate-200 rounded h-4 w-5/6" />
          </div>
        )}

        {feedback && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <strong className="text-slate-900">Strengths</strong>
                <ul className="list-disc ml-5 text-slate-700 space-y-1">
                  {feedback.strengths?.map((s, idx) => (
                    <li key={idx}>Demonstrates: {s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong className="text-slate-900">Improvements</strong>
                <ul className="list-disc ml-5 text-slate-700 space-y-1">
                  {feedback.improvements?.map((s, idx) => (
                    <li key={idx}>Partially demonstrates / needs: {s}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-slate-800">
              <strong className="text-slate-900">Improved answer</strong>
              <p className="text-slate-800 mt-1">{feedback.improved_answer}</p>
            </div>
            {nextPreview && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <strong className="text-slate-900">Next question preview</strong>
                <p className="text-slate-700 mt-1">{nextPreview}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

