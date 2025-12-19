import "dotenv/config";
import { query } from "../db/client.js";
import { generateInterviewTurn } from "../utils/openai.js";
import { requireFields } from "../utils/validate.js";

const isLowQualityAnswer = (answer = "") => {
  const trimmed = answer.trim().toLowerCase();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const fillerList = ["idk", "i don't know", "n/a", "na", "none", "asdf", "test", "aaa", "???", "..."];
  const clean = trimmed.replace(/\s+/g, "");
  const uniqueChars = Array.from(new Set(clean));
  const counts = uniqueChars.map((ch) => clean.split(ch).length - 1);
  const total = clean.length || 1;
  const dominant = Math.max(...counts);

  const isNonsense =
    trimmed.length < 8 ||
    wordCount < 2 ||
    fillerList.includes(trimmed) ||
    dominant / total > 0.8 ||
    /(.)\1{2,}/.test(trimmed);

  if (isNonsense) {
    return { tier: "nonsense", reason: "Too short or filler" };
  }

  // Generic tier: relevant words but low detail; allow normal scoring with floors
  return { tier: "generic", reason: "" };
};

const extractEvidence = (answer = "") => {
  const hasStructure = /(first|second|then|next|after|finally|step)/i.test(answer);
  const hasDetails = /(who|what|when|where|why|because|during|after|while)/i.test(answer);
  const clarityPoints =
    (hasStructure ? 1 : 0) + (hasDetails ? 1 : 0) + (answer.length > 120 ? 1 : 0);

  const decisiveLanguage = /(i (did|escalated|reassessed|administered|escalated|called|notified|communicated))/i.test(
    answer
  );
  const hedgingOnly = /(maybe|i think|i would|i guess)/i.test(answer) && !decisiveLanguage;
  const communicationMention = /(notified|called|spoke with|updated|communicated|escalated)/i.test(
    answer
  );
  const confidencePoints =
    (decisiveLanguage ? 1 : 0) + (!hedgingOnly ? 1 : 0) + (communicationMention ? 1 : 0);

  const mentionsAssessment = /(bp|hr|rr|spo2|map|vitals|assessment|symptom|pain|respiratory|neuro)/i.test(
    answer
  );
  const mentionsPrioritization = /(abc|priority|unstable|stable|safety|time-sensitive|triage)/i.test(
    answer
  );
  const mentionsEscalation = /(provider|rapid response|charge nurse|team|collaborat|consult)/i.test(
    answer
  );
  const mentionsOutcome = /(outcome|reassess|improved|worsened|stabilized|resolved)/i.test(answer);
  const reasoningPoints =
    (mentionsAssessment ? 1 : 0) +
    (mentionsPrioritization ? 1 : 0) +
    (mentionsEscalation ? 1 : 0) +
    (mentionsOutcome ? 1 : 0);

  return {
    clarityPoints: Math.min(3, clarityPoints),
    confidencePoints: Math.min(3, confidencePoints),
    reasoningPoints: Math.min(4, reasoningPoints),
  };
};

const hasNursingSafetySignals = (answer = "") => {
  const text = answer.toLowerCase();
  let count = 0;
  if (/check/.test(text) && /(patient|medication)/.test(text)) count += 1;
  if (/five rights|rights/.test(text)) count += 1;
  if (/allergy/.test(text)) count += 1;
  if (/ask/.test(text) && /(nurse|preceptor)/.test(text)) count += 1;
  if (/monitor|side effects|reassess/.test(text)) count += 1;
  if (/order|mar/.test(text)) count += 1;
  const askedForHelp = /ask/.test(text) && /(nurse|preceptor)/.test(text);
  return { count, askedForHelp };
};

const analyzeAnswer = (answer = "") => {
  const text = answer.toLowerCase();
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const actionVerbs = [
    "assessed",
    "evaluated",
    "monitored",
    "escalated",
    "delegated",
    "intervened",
    "administered",
    "reassessed",
    "educated",
    "coached",
    "triaged",
    "stabilized",
    "prioritized",
    "notified",
    "coordinated",
    "collaborated",
    "responded",
    "de-escalated",
    // Education/communication-specific verbs
    "explained",
    "taught",
    "instructed",
    "demonstrated",
    "reinforced",
    "counseled",
    "teach-back",
    "verified",
    "provided discharge instructions",
    "used interpreter",
  ];
  const actionMatches = actionVerbs.filter((v) => new RegExp(`\\b${v}\\b`, "i").test(answer));

  const specificitySignals = [
    /(bp|blood pressure|hr|heart rate|rr|respiratory rate|spo2|map)/i,
    /(vent|ventilator|drip|iv|line|central line|abg)/i,
    /(\d+(\.\d+)?\s?(mg|mcg|ml|units))/i,
    /(rt|respiratory therapist|charge|rapid response)/i,
    /(teach-back|interpreter|education|instruction|explain)/i,
  ].filter((re) => re.test(answer)).length;

  // Relaxed example detection: 2+ first-person action verbs plus any situational marker
  const hasExample =
    actionMatches.length >= 2 &&
    /(patient|family|provider|nurse|unit|shift|symptom|pain|meds|refusal|concern|clinic|floor|room|discharge|education)/i.test(
      answer
    );

  const hasActions = actionMatches.length >= 2;

  const hasOutcome =
    /(stabilized|improved|resolved|avoided|reduced|decreased|controlled|prevented|de-?escalated|escalated appropriately|better|worse)/i.test(
      answer
    ) ||
    /(verbalized understanding|teach-back|able to repeat instructions|demonstrated technique|agreed to plan|asked appropriate questions|follow-up plan confirmed)/i.test(
      answer
    );

  const redFlagPhrases = [
    "i just follow orders",
    "i waited",
    "i can't think of",
    "i cannot think of",
    "doctors already know",
    "not really had to",
    "hope things slow down",
    "wait and see",
    "not sure",
    "i guess",
    "nothing specific",
    "i didn't do much",
    "would probably",
  ];
  const redFlags = redFlagPhrases.filter((p) => text.includes(p));

  const numericTokens = (answer.match(/\b\d+(\.\d+)?\b/g) || []).length;
  const clinicalKeywords = (answer.match(/bp|hr|rr|spo2|map|vent|drip|iv|abg/gi) || []).length;
  const isVague = specificitySignals < 2 && numericTokens + clinicalKeywords < 2;

  const ethicsSignals = (answer.match(/autonomy|consent|goals of care|family|advocacy|document|advance directive|dnr|capacity|surrogate|values|preferences|power of attorney|guardian|shared decision/i) || [])
    .length;

  const educationSignals =
    (answer.match(/educated|explained|taught|instructed|demonstrated|reinforced|counseled|teach-back|discharge instructions|interpreter|verified understanding/gi) || [])
      .length;

  return {
    hasExample,
    hasActions,
    hasOutcome,
    redFlags,
    wordCount,
    isVague,
    actionMatches: actionMatches.length,
    specificitySignals,
    numericTokens,
    clinicalKeywords,
    ethicsSignals,
    educationSignals,
  };
};

const isEthicalQuestion = (questionText = "") =>
  /ethical|goals of care|end-of-life|family disagreement|consent|autonomy|dnr|advance directive/i.test(
    questionText
  );

const applyScoreCaps = (aiScores = {}, analysis, questionText = "") => {
  let clarity = aiScores.clarity ?? 0;
  let confidence = aiScores.confidence ?? 0;
  let clinical_reasoning = aiScores.clinical_reasoning ?? 0;

  // Clinical reasoning floor to avoid unjustified 1s on reasonable answers
  let clinical_floor = 1;
  if (analysis.hasActions) clinical_floor = 3;
  if (analysis.hasExample) clinical_floor = 4;
  if (analysis.hasActions && analysis.hasOutcome) clinical_floor = 5;
  if (analysis.redFlags.length) clinical_floor = 1; // red flags override floor
  clinical_reasoning = Math.max(clinical_reasoning, clinical_floor);

  // Education-aware: count education signals as actions when present
  const effectiveHasActions =
    analysis.hasActions || (analysis.educationSignals && analysis.educationSignals >= 2);

  if (!analysis.hasExample) clinical_reasoning = Math.min(clinical_reasoning, 4);
  if (!effectiveHasActions) clinical_reasoning = Math.min(clinical_reasoning, 4);
  if (analysis.wordCount < 40) clarity = Math.min(clarity, 4);

  if (analysis.isVague) {
    clinical_reasoning = Math.min(clinical_reasoning, 4);
    confidence = Math.min(confidence, 5);
  }

  const ethical = isEthicalQuestion(questionText);
  if (ethical) {
    const hasEthicsSignals = analysis.ethicsSignals >= 2;
    clinical_reasoning = Math.min(clinical_reasoning, hasEthicsSignals ? 7 : 5);
  } else if (!analysis.hasOutcome) {
    clinical_reasoning = Math.min(clinical_reasoning, 5);
  }

  // Allow slightly higher ceiling for education-heavy answers even without classic clinical outcome wording
  if (!ethical && analysis.educationSignals >= 3 && analysis.wordCount >= 45) {
    clinical_reasoning = Math.min(clinical_reasoning, 6);
  }

  if (analysis.redFlags.length) {
    confidence = Math.min(confidence, 4);
    clinical_reasoning = Math.min(clinical_reasoning, 3);
  }

  // Clarity floors/caps: coherent text should not be 1 unless nonsense
  if (analysis.wordCount >= 20) {
    clarity = Math.max(clarity, 2);
  }
  const hasStructureOrExample = /(first|then|after|when|for example)/i.test(questionText) || effectiveHasActions;
  if (!hasStructureOrExample) {
    clarity = Math.min(clarity, 5);
  }

  const clamp = (v) => Math.max(0, Math.min(10, Math.round(v)));

  return {
    clarity: clamp(clarity),
    confidence: clamp(confidence),
    clinical_reasoning: clamp(clinical_reasoning),
  };
};

const applyEvidenceCaps = (scores = {}, evidence = {}, isLow = false, vaguePenalty = 0) => {
  let { clarity = 0, confidence = 0, clinical_reasoning = 0 } = scores;
  if (isLow) {
    clarity = Math.min(clarity, 2);
    confidence = Math.min(confidence, 2);
    clinical_reasoning = Math.min(clinical_reasoning, 2);
  }

  const cap = (val, max) => Math.max(1, Math.min(10, Math.round(Math.min(val, max))));
  const clarityMax = 2 + (evidence.clarityPoints ?? 0) * 2;
  const confidenceMax = 2 + (evidence.confidencePoints ?? 0) * 2;
  const reasoningMax = 1 + (evidence.reasoningPoints ?? 0) * 2;

  clarity = cap(clarity, clarityMax);
  confidence = cap(confidence, confidenceMax);
  clinical_reasoning = cap(clinical_reasoning, reasoningMax);

  if (vaguePenalty > 0) {
    clarity = cap(clarity - vaguePenalty, clarityMax);
    confidence = cap(confidence - vaguePenalty, confidenceMax);
    clinical_reasoning = cap(clinical_reasoning - vaguePenalty, reasoningMax);
  }

  return { clarity, confidence, clinical_reasoning };
};

const tuneImprovedAnswer = (improved = "", adjustedScores = {}, question = "", userAnswer = "") => {
  const cr = adjustedScores.clinical_reasoning ?? 0;
  const avg =
    (adjustedScores.clarity ?? 0 + adjustedScores.confidence ?? 0 + cr) / 3 || cr;
  const trimmed = (improved || "").trim();
  const questionSnippet = question ? question.slice(0, 160) : "the question";

  // Mode selection based on overall score band
  if (avg <= 2) {
    // Guided feedback only, no model answer, no framework names
    return [
      `The answer needs concrete detail for "${questionSnippet}".`,
      "To improve next time, include:",
      "- What you assessed (specific findings or risks).",
      "- One or two actions you actually took.",
      "- Who you communicated with and why.",
      "- The result or how you would reassess.",
    ].join(" ");
  }

  if (avg <= 5) {
    // Partial, realistic example for new grads; short and not perfect
    return [
      `Example tied to "${questionSnippet}":`,
      "I checked the patient’s key findings, escalated one concern to the nurse/charge, and started a basic intervention.",
      "I let the team know what I saw and asked for help early, then reassessed to confirm the patient was stable.",
    ].join(" ");
  }

  // avg > 5: fuller structured example, concise and specific
  return trimmed
    .replace(/(this (reinforced|highlighted) the importance of\s*)/gi, "")
    .replace(/in conclusion[:,]?\s*/gi, "")
    .trim();
};

const norm = (s = "") => String(s).trim().replace(/\s+/g, " ").toLowerCase();
const isSameQuestion = (a, b) => {
  const na = norm(a);
  const nb = norm(b);
  return na && nb && na === nb;
};

const loadEntitlement = async (userId) => {
  const { rows } = await query("SELECT plan, status, trial_used FROM entitlements WHERE user_id=$1", [
    userId,
  ]);
  if (rows.length) return rows[0];
  const { rows: created } = await query(
    "INSERT INTO entitlements(user_id, plan, status, trial_used) VALUES($1,'free','inactive',FALSE) RETURNING plan,status,trial_used",
    [userId]
  );
  return created[0];
};

const ensureEntitled = async (userId, mode) => {
  const ent = await loadEntitlement(userId);
  if (ent.status === "active") return { ok: true, ent };
  if (!ent.trial_used && mode === "quick") {
    return { ok: true, ent, markTrial: true };
  }
  return { ok: false, message: "Trial used. Please upgrade to continue." };
};

export const startInterview = async (req, res, next) => {
  try {
    const required = ["mode", "specialty", "experience_level"];
    const { ok, missing } = requireFields(req.body, required);
    if (!ok) {
      return res.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });
    }
    const { mode, specialty, experience_level, hospital_name, job_text } = req.body;
    if (!["quick", "full"].includes(mode)) {
      return res.status(400).json({ message: "Mode must be quick or full" });
    }

    const entitlement = await ensureEntitled(req.user.id, mode);
    if (!entitlement.ok) {
      return res.status(402).json({ message: entitlement.message });
    }

    const { rows } = await query(
      `INSERT INTO interview_sessions(user_id, mode, specialty, experience_level, hospital_name, job_text)
       VALUES($1,$2,$3,$4,$5,$6)
       RETURNING id, mode, specialty, experience_level, hospital_name, job_text, created_at`,
      [req.user.id, mode, specialty, experience_level, hospital_name || null, job_text || null]
    );
    const session = rows[0];

    if (entitlement.markTrial) {
      await query("UPDATE entitlements SET trial_used=TRUE, updated_at=NOW() WHERE user_id=$1", [
        req.user.id,
      ]);
    }

    const ai = await generateInterviewTurn({
      mode,
      specialty,
      experienceLevel: experience_level,
      hospitalName: hospital_name,
      jobText: job_text,
      userAnswer: "",
      previousTurns: [],
    });

    // Store the initial question so reports retain the full interview
    await query(
      `INSERT INTO interview_turns(session_id, question, user_answer, ai_feedback_json, ai_improved_answer, scores_json)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [
        session.id,
        ai.question,
        null,
        JSON.stringify({ strengths: [], improvements: [] }),
        ai.improved_answer || "",
        JSON.stringify({ clarity: 0, confidence: 0, clinical_reasoning: 0 }),
      ]
    );

    return res.status(201).json({
      session,
      question: ai.question,
      next_question_preview: ai.next_question_preview || "",
      scores: ai.scores,
      strengths: ai.strengths,
      improvements: ai.improvements,
      improved_answer: ai.improved_answer,
      done: ai.done,
      session_summary: ai.session_summary,
    });
  } catch (err) {
    return next(err);
  }
};

export const answerQuestion = async (req, res, next) => {
  try {
    const required = ["answer", "question"];
    const { ok, missing } = requireFields(req.body, required);
    if (!ok) {
      return res.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });
    }
    const { answer, question } = req.body;
    const sessionId = req.params.id;

    const { rows: sessions } = await query(
      "SELECT * FROM interview_sessions WHERE id=$1 AND user_id=$2",
      [sessionId, req.user.id]
    );
    if (!sessions.length) {
      return res.status(404).json({ message: "Session not found" });
    }
    const session = sessions[0];
    const maxQuestions = session.mode === "quick" ? 5 : 12;

    // If already ended, short-circuit to report
    if (session.ended_at) {
      return res.json({ status: "completed", sessionId });
    }

    // Count answered turns before processing to avoid extra OpenAI calls when already complete
    const { rows: answeredBeforeRows } = await query(
      "SELECT COUNT(*)::int AS count FROM interview_turns WHERE session_id=$1 AND user_answer IS NOT NULL",
      [sessionId]
    );
    const answeredBefore = answeredBeforeRows[0].count;
    if (answeredBefore >= maxQuestions) {
      await query("UPDATE interview_sessions SET ended_at=NOW() WHERE id=$1 AND ended_at IS NULL", [
        sessionId,
      ]);
      return res.json({ status: "completed", sessionId });
    }

    const { rows: previous } = await query(
      "SELECT id, question, user_answer, ai_improved_answer AS improved_answer, scores_json AS scores FROM interview_turns WHERE session_id=$1 ORDER BY created_at ASC",
      [sessionId]
    );

    // Pending turn is the first with user_answer null; used to hydrate and prevent duplicates
    const pendingTurn = previous.find((t) => t.user_answer === null);

    const lowQuality = isLowQualityAnswer(answer);
    const safetySignals = hasNursingSafetySignals(answer);

    let ai = await generateInterviewTurn({
      mode: session.mode,
      specialty: session.specialty,
      experienceLevel: session.experience_level,
      hospitalName: session.hospital_name,
      jobText: session.job_text,
      userAnswer: answer,
      previousTurns: previous,
      currentQuestion: question,
    });

    // Guard against duplicate next_question; retry once with explicit hint
    if (isSameQuestion(ai.next_question, question)) {
      ai = await generateInterviewTurn({
        mode: session.mode,
        specialty: session.specialty,
        experienceLevel: session.experience_level,
        hospitalName: session.hospital_name,
        jobText: session.job_text,
        userAnswer: answer,
        previousTurns: previous,
        currentQuestion: question,
        forceDifferentNextQuestionFrom: question,
      });
    }

    // If still same, fallback to local bank to guarantee uniqueness
    if (isSameQuestion(ai.next_question, question)) {
      const used = new Set(previous.map((t) => norm(t.question)));
      used.add(norm(question));
      const bank = [
        "Tell me about a time you had to escalate care for a deteriorating patient. What did you notice and what did you do?",
        "How do you communicate critical changes to providers using SBAR? Give an example.",
        "Describe a medication safety situation you handled. What checks did you perform?",
        "How do you respond to a conflict with a provider or team member while advocating for a patient?",
        "Describe a time you managed a sudden change in patient status. What assessments and interventions did you prioritize?",
        "How do you handle an ethical concern when family wishes conflict with patient goals of care?",
      ];
      const pick = bank.find((q) => !used.has(norm(q)));
      ai.next_question = pick || bank[0];
    }

    const analysis = analyzeAnswer(answer);
    const evidencePoints = extractEvidence(answer);

    const vagueMatches = (answer.match(/i would|i think|maybe|try to|just/i) || []).length;
    const vaguePenalty = !analysis.hasActions && vagueMatches >= 3 ? 3 : vagueMatches >= 2 ? 2 : vagueMatches >= 1 ? 1 : 0;

    const cappedByAnalysis = applyScoreCaps(ai.scores, analysis, question);
    let evidenceCapped = applyEvidenceCaps(
      cappedByAnalysis,
      evidencePoints,
      lowQuality.tier === "nonsense",
      vaguePenalty
    );

    // Apply relevance floors for generic but relevant answers with safety signals
    if (lowQuality.tier !== "nonsense" && safetySignals.count > 0) {
      evidenceCapped.clarity = Math.max(evidenceCapped.clarity, 2);
      evidenceCapped.confidence = Math.max(evidenceCapped.confidence, safetySignals.askedForHelp ? 3 : 2);
      evidenceCapped.clinical_reasoning = Math.max(
        evidenceCapped.clinical_reasoning,
        safetySignals.count >= 3 ? 3 : 2
      );
    }

    // If AI evidence quotes are missing or not found in answer, downgrade further
    const aiEvidence = ai.evidence || {};
    const categories = ["clarity", "confidence", "clinical_reasoning"];
    let missingEvidencePenalty = 0;
    for (const cat of categories) {
      const quotes = aiEvidence[cat] || [];
      const valid = quotes.filter((q) => q && answer.toLowerCase().includes((q || "").toLowerCase())).length;
      if (valid === 0) missingEvidencePenalty = Math.max(missingEvidencePenalty, 2);
    }
    let finalScores = {
      clarity: Math.max(1, evidenceCapped.clarity - missingEvidencePenalty),
      confidence: Math.max(1, evidenceCapped.confidence - missingEvidencePenalty),
      clinical_reasoning: Math.max(1, evidenceCapped.clinical_reasoning - missingEvidencePenalty),
    };

    if (lowQuality.tier === "nonsense") {
      finalScores = { clarity: 1, confidence: 1, clinical_reasoning: 1 };
    }

    // Guard: if improved answer lacks topic keywords, rewrite locally to bind to current question
    const candidateImproved = tuneImprovedAnswer(ai.improved_answer, finalScores, question, answer);
    const keywords = (question.match(/\b[a-z]{4,}\b/gi) || []).slice(0, 6);
    const missingQuestionKeywords =
      keywords.length &&
      keywords.filter((k) => !candidateImproved.toLowerCase().includes(k.toLowerCase())).length === keywords.length;
    const tunedImproved = missingQuestionKeywords
      ? `In response to "${question}", I first summarize the situation, perform a focused assessment, take 2-3 clear actions, communicate with the appropriate nurse/provider, and describe the outcome or reassessment tied to this scenario.`
      : candidateImproved;
    const finalStrengths =
      lowQuality.tier === "nonsense" && !ai.strengths?.length
        ? ["Shows willingness to answer"]
        : ai.strengths;
    const finalImprovements = lowQuality.tier === "nonsense"
      ? [
          "Response is too short or lacks clinical detail.",
          "Add assessment data, actions taken, and outcomes tied to the question.",
          "Avoid filler; provide a specific scenario with actions and result.",
        ]
      : ai.improvements;

    if (pendingTurn && pendingTurn.question === question) {
      // Update the existing pending row with the user's answer and feedback to avoid duplicate turns
      await query(
        `UPDATE interview_turns
         SET user_answer=$1,
             ai_feedback_json=$2,
             ai_improved_answer=$3,
             scores_json=$4,
             created_at=NOW()
         WHERE id=$5`,
        [
          answer,
          JSON.stringify({
            strengths: finalStrengths,
            improvements: finalImprovements,
            evidence: ai.evidence || {},
            missing: ai.missing || [],
            summary: ai.session_summary || null,
          flags: {
              hasExample: analysis.hasExample,
              hasActions: analysis.hasActions,
              hasOutcome: analysis.hasOutcome,
              redFlags: analysis.redFlags,
              wordCount: analysis.wordCount,
              isVague: analysis.isVague,
              specificitySignals: analysis.specificitySignals,
              numericTokens: analysis.numericTokens,
              clinicalKeywords: analysis.clinicalKeywords,
              ethicsSignals: analysis.ethicsSignals,
            },
            finalAdjustedScores: finalScores,
            _debug: {
              detectedTier: lowQuality.tier,
              safetySignalsCount: safetySignals.count,
              rawAiScores: ai.scores,
              finalScores,
            },
          }),
          tunedImproved,
          JSON.stringify(finalScores),
          pendingTurn.id,
        ]
      );
    } else {
      // Insert answered turn as before when no pending row matches
      await query(
        `INSERT INTO interview_turns(session_id, question, user_answer, ai_feedback_json, ai_improved_answer, scores_json)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [
          sessionId,
          question,
          answer,
          JSON.stringify({
            strengths: finalStrengths,
            improvements: finalImprovements,
            evidence: ai.evidence || {},
            missing: ai.missing || [],
            summary: ai.session_summary || null,
            flags: {
              hasExample: analysis.hasExample,
              hasActions: analysis.hasActions,
              hasOutcome: analysis.hasOutcome,
              redFlags: analysis.redFlags,
              wordCount: analysis.wordCount,
              isVague: analysis.isVague,
              specificitySignals: analysis.specificitySignals,
              numericTokens: analysis.numericTokens,
              clinicalKeywords: analysis.clinicalKeywords,
              ethicsSignals: analysis.ethicsSignals,
            },
            finalAdjustedScores: finalScores,
            _debug: {
              detectedTier: lowQuality.tier,
              safetySignalsCount: safetySignals.count,
              rawAiScores: ai.scores,
              finalScores,
            },
          }),
          tunedImproved,
          JSON.stringify(finalScores),
        ]
      );
    }

    // Count answered turns after inserting this answer
    const { rows: answeredAfterRows } = await query(
      "SELECT COUNT(*)::int AS count FROM interview_turns WHERE session_id=$1 AND user_answer IS NOT NULL",
      [sessionId]
    );
    const answeredAfter = answeredAfterRows[0].count;
    const completed = answeredAfter >= maxQuestions || ai.done;

    if (completed) {
      await query("UPDATE interview_sessions SET ended_at=NOW() WHERE id=$1", [sessionId]);
      return res.json({
        status: "completed",
        sessionId,
        feedback: {
          scores: finalScores,
          strengths: finalStrengths,
          improvements: finalImprovements,
          improved_answer: tunedImproved,
          evidence: ai.evidence || {},
          missing: ai.missing || [],
          summary: ai.session_summary || null,
          _debug: {
            detectedTier: lowQuality.tier,
            safetySignalsCount: safetySignals.count,
            rawAiScores: ai.scores,
            finalScores,
          },
        },
      });
    }

    // Persist next question as a pending turn so resume works after navigation/refresh
    if (ai.next_question) {
      await query(
        `INSERT INTO interview_turns(session_id, question, user_answer, ai_feedback_json, ai_improved_answer, scores_json)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [
          sessionId,
          ai.next_question,
          null,
          JSON.stringify({}),
          "",
          JSON.stringify({ clarity: 0, confidence: 0, clinical_reasoning: 0 }),
        ]
      );
    }

    return res.json({
      status: "in_progress",
      sessionId,
      question: ai.next_question,
      next_question_preview: ai.next_question_preview || "",
      feedback: {
        scores: finalScores,
        strengths: finalStrengths,
        improvements: finalImprovements,
        improved_answer: tunedImproved,
        evidence: ai.evidence || {},
        missing: ai.missing || [],
        summary: ai.session_summary || null,
        _debug: {
          detectedTier: lowQuality.tier,
          safetySignalsCount: safetySignals.count,
          rawAiScores: ai.scores,
          finalScores,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
};

export const listInterviews = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, mode, specialty, experience_level, hospital_name, created_at, ended_at
       FROM interview_sessions
       WHERE user_id=$1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json({ sessions: rows });
  } catch (err) {
    return next(err);
  }
};

export const getInterview = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const { rows: sessions } = await query(
      `SELECT id, user_id, mode, specialty, experience_level, hospital_name, job_text, created_at, ended_at
       FROM interview_sessions WHERE id=$1`,
      [sessionId]
    );
    if (!sessions.length || sessions[0].user_id !== req.user.id) {
      return res.status(404).json({ message: "Session not found" });
    }
    const session = sessions[0];
    const { rows: turns } = await query(
      `SELECT id, question, user_answer, ai_feedback_json, ai_improved_answer, scores_json, created_at
       FROM interview_turns WHERE session_id=$1 ORDER BY created_at ASC`,
      [sessionId]
    );
    const enrichedTurns = turns.map((t) => ({
      ...t,
      is_seed_turn: t.user_answer === null,
    }));

    const answered = enrichedTurns.filter((t) => t.user_answer !== null);
    const totals = answered.reduce(
      (acc, t) => {
        acc.clarity += t.scores_json?.clarity ?? 0;
        acc.confidence += t.scores_json?.confidence ?? 0;
        acc.clinical_reasoning += t.scores_json?.clinical_reasoning ?? 0;
        acc.count += 1;
        return acc;
      },
      { clarity: 0, confidence: 0, clinical_reasoning: 0, count: 0 }
    );
    const divisor = Math.max(1, totals.count);
    const average_scores = {
      clarity: Math.round((totals.clarity / divisor) * 10) / 10,
      confidence: Math.round((totals.confidence / divisor) * 10) / 10,
      clinical_reasoning: Math.round((totals.clinical_reasoning / divisor) * 10) / 10,
    };
    const crAvg = average_scores.clinical_reasoning;
    let overall_level = "Needs improvement";
    if (crAvg >= 9) overall_level = "Strong candidate";
    else if (crAvg >= 7) overall_level = "Interview-ready";
    else if (crAvg >= 4) overall_level = "Developing";

    const strengthsAll = answered.flatMap((t) => t.ai_feedback_json?.strengths || []);
    const improvementsAll = answered.flatMap((t) => t.ai_feedback_json?.improvements || []);
    const summaryFromTurns = [...answered].reverse().find((t) => t.ai_feedback_json?.summary)?.ai_feedback_json?.summary;

    const topN = (arr, n) => {
      const freq = arr.reduce((m, item) => {
        const key = item.trim().toLowerCase();
        if (!key) return m;
        m[key] = (m[key] || 0) + 1;
        return m;
      }, {});
      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([k]) => k);
    };
    const topStrengths = topN(strengthsAll, 3);
    const topGaps = topN(improvementsAll, 3);

    const fallbackSummary = {
      overall: `Interview summary for ${session.specialty || "your role"} (${session.experience_level || "experience"}).`,
      strengths: topStrengths.slice(0, 3),
      improvements: topGaps.slice(0, 3),
      next_focus: "Practice stating one concrete action and outcome for each scenario.",
    };

    const session_summary = summaryFromTurns || fallbackSummary;

    return res.json({ session, turns: enrichedTurns, average_scores, overall_level, session_summary });
  } catch (err) {
    return next(err);
  }
};

