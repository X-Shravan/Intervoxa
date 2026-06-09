// Gemini-ready service layer for Intervoxa's conversational AI interviewer.
// The browser UI works with deterministic mock AI when no key is supplied, then switches to Gemini when a key is saved.
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const HISTORY_KEY = "intervoxaInterviewHistory";
const API_KEY_STORAGE_KEY = "intervoxaGeminiApiKey";

export const domainOptions = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Android Developer",
  "AI Engineer",
  "Data Scientist",
  "DevOps Engineer",
  "Cyber Security",
  "HR Interview",
];

export const experienceOptions = ["Fresher", "Intern", "Junior", "Mid-Level", "Senior"];
export const languageOptions = ["Java", "Python", "JavaScript", "C", "C++", "C#", "PHP", "Go", "Kotlin", "Swift", "SQL"];
export const difficultyOptions = ["Beginner", "Medium", "Advanced"];
export const questionTypeOptions = ["Technical", "HR", "Mixed"];

const domainSkills = {
  "Software Engineer": ["problem solving", "data structures", "system design", "testing"],
  "Frontend Developer": ["HTML", "CSS", "JavaScript", "accessibility", "responsive UI"],
  "Backend Developer": ["APIs", "databases", "authentication", "scalability"],
  "Full Stack Developer": ["frontend architecture", "backend APIs", "databases", "deployment"],
  "Android Developer": ["Kotlin", "Android lifecycle", "Jetpack", "mobile UX"],
  "AI Engineer": ["machine learning", "prompting", "model evaluation", "MLOps"],
  "Data Scientist": ["statistics", "Python", "SQL", "model validation"],
  "DevOps Engineer": ["CI/CD", "cloud", "containers", "observability"],
  "Cyber Security": ["network security", "OWASP", "threat modeling", "incident response"],
  "HR Interview": ["communication", "teamwork", "leadership", "self-awareness"],
};

const certificationMap = {
  "Software Engineer": ["Oracle Java", "AWS Cloud Practitioner", "Meta Back-End Developer"],
  "Frontend Developer": ["Meta Front-End Developer", "Google UX Design", "freeCodeCamp Responsive Web Design"],
  "Backend Developer": ["Oracle Java", "AWS Certified Developer", "PostgreSQL Associate"],
  "Full Stack Developer": ["IBM Full Stack Software Developer", "MongoDB Associate Developer", "AWS Cloud Practitioner"],
  "Android Developer": ["Associate Android Developer", "Kotlin Developer Certification", "Google Play Academy"],
  "AI Engineer": ["Google Machine Learning Engineer", "Microsoft Azure AI Engineer", "DeepLearning.AI TensorFlow Developer"],
  "Data Scientist": ["Google Advanced Data Analytics", "Microsoft Azure Data Scientist", "IBM Data Science Professional"],
  "DevOps Engineer": ["AWS DevOps Engineer", "Docker Certified Associate", "Certified Kubernetes Administrator"],
  "Cyber Security": ["CompTIA Security+", "Google Cybersecurity Certificate", "Certified Ethical Hacker"],
  "HR Interview": ["LinkedIn Interview Prep", "Google Project Management", "Toastmasters Communication Pathways"],
};

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeParseJson(text) {
  const trimmed = text.trim().replace(/^```json|```$/g, "").trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : null;
  }
}

async function callGemini(prompt, apiKey) {
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Using Intervoxa mock AI instead.");
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.72,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Gemini request failed. Check the API key, quota, or network connection.");
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n") || "";
}

function skillsFor(domain) {
  return domainSkills[domain] || domainSkills["Software Engineer"];
}

function transcriptFrom(conversation) {
  return conversation.map((turn) => `${turn.role === "assistant" ? "Interviewer" : "Candidate"}: ${turn.content}`).join("\n");
}

function buildInterviewerSystemPrompt(config) {
  return `You are a senior human interviewer for Intervoxa AI.
Candidate name: ${config.candidateName || "Candidate"}.
Role: ${config.domain}.
Experience: ${config.experience}.
Programming language: ${config.language}.
Interview type: ${config.questionType}.
Difficulty: ${config.difficulty}.
Stress interview mode: ${config.stressMode ? "enabled" : "disabled"}.

Conduct a realistic conversational interview, not a static quiz.
Rules:
1. Ask only one question at a time.
2. Listen to the candidate response and ask a relevant follow-up.
3. Challenge vague, incomplete, or weak answers.
4. Change topics naturally when enough depth is covered.
5. Ask for examples, trade-offs, and real project details.
6. Mix technical and behavioral questions when appropriate.
7. Maintain memory of earlier skills, projects, weak areas, and answers.
8. Continue for 15-20 interviewer questions unless the candidate asks to stop.
9. End with feedback only when explicitly requested or when enough turns are complete.
10. Return JSON only using this schema: {"message":"next interviewer response","focusArea":"topic","shouldEnd":false}.`;
}

function buildFallbackTurn(conversation, config) {
  const candidateTurns = conversation.filter((turn) => turn.role === "user");
  const lastAnswer = candidateTurns.at(-1)?.content || "";
  const lowerAnswer = lastAnswer.toLowerCase();
  const skills = skillsFor(config.domain);
  const name = config.candidateName || "Candidate";
  const askedCount = conversation.filter((turn) => turn.role === "assistant").length;

  if (askedCount === 0) {
    return {
      message: `Hello ${name}, welcome to Intervoxa AI. I will be your virtual interviewer today. To begin, can you briefly introduce yourself and tell me why you are interested in the ${config.domain} role?`,
      focusArea: "introduction",
      shouldEnd: false,
    };
  }

  if (config.stressMode && lastAnswer.split(/\s+/).filter(Boolean).length < 18) {
    return {
      message: "Your answer is a bit incomplete. Can you justify your approach with a concrete example, the trade-offs you considered, and the result you achieved?",
      focusArea: "depth and clarity",
      shouldEnd: false,
    };
  }

  if (/firebase|firestore|realtime database|authentication/.test(lowerAnswer)) {
    return {
      message: "You mentioned Firebase. Which Firebase services did you use, and why did you choose that architecture over alternatives such as a custom backend or Realtime Database?",
      focusArea: "Firebase architecture",
      shouldEnd: false,
    };
  }

  if (/android|kotlin|mobile|app/.test(lowerAnswer)) {
    return {
      message: "Interesting. Tell me about one Android project you worked on. What challenge did you face, and how would you improve it if the app needed to support 100,000 users?",
      focusArea: "Android scalability",
      shouldEnd: false,
    };
  }

  if (/team|conflict|collaborat|group/.test(lowerAnswer) || config.questionType === "HR") {
    return {
      message: "Let's explore teamwork. Tell me about a time you had a disagreement in a team. What conflict occurred, how did you resolve it, and what would you do differently now?",
      focusArea: "behavioral teamwork",
      shouldEnd: false,
    };
  }

  const topic = skills[askedCount % skills.length];
  return {
    message: `Let's move deeper into ${topic}. For a ${config.experience} ${config.domain}, explain one practical scenario where ${topic} matters, and include how you would implement or measure it using ${config.language}.`,
    focusArea: topic,
    shouldEnd: askedCount >= 15,
  };
}

function normalizeInterviewerTurn(parsed, fallback) {
  return {
    message: parsed?.message || parsed?.question || fallback.message,
    focusArea: parsed?.focusArea || parsed?.topic || fallback.focusArea,
    shouldEnd: Boolean(parsed?.shouldEnd ?? fallback.shouldEnd),
  };
}

function fallbackFinalReport(conversation, config) {
  const candidateText = conversation
    .filter((turn) => turn.role === "user")
    .map((turn) => turn.content)
    .join(" ");
  const words = candidateText.split(/\s+/).filter(Boolean).length;
  const hasExamples = /project|example|built|implemented|created|developed|designed/i.test(candidateText);
  const hasStructure = /first|second|finally|situation|task|action|result|because|therefore|trade-off/i.test(candidateText);
  const technicalMention = new RegExp(skillsFor(config.domain).join("|"), "i").test(candidateText);
  const base = Math.min(88, Math.max(48, words + (hasExamples ? 12 : 0) + (hasStructure ? 10 : 0) + (technicalMention ? 10 : 0)));

  return {
    overallScore: Number((base / 10).toFixed(1)),
    communication: Number((Math.min(95, base + (hasStructure ? 5 : -5)) / 10).toFixed(1)),
    technicalSkills: Number((Math.min(95, base + (technicalMention ? 7 : -8)) / 10).toFixed(1)),
    confidence: Number((Math.min(95, base + (words > 80 ? 5 : -6)) / 10).toFixed(1)),
    problemSolving: Number((Math.min(95, base + (hasExamples ? 6 : -5)) / 10).toFixed(1)),
    strengths: [hasExamples ? "Used project-oriented examples." : "Answered the interviewer's questions directly.", technicalMention ? `${config.domain} fundamentals were mentioned.` : "Showed willingness to explain concepts."],
    weaknesses: [hasStructure ? "Add more measurable impact to answers." : "Use STAR or step-by-step structure more consistently.", technicalMention ? "Go deeper into scalability and trade-offs." : `Revise core ${config.domain} topics before the next round.`],
    idealAnswer: `Strong answers for ${config.domain} should include context, a specific example, ${config.language} implementation details, trade-offs, measurable result, and reflection.`,
    recommendedCertifications: getCertificationRecommendations(config.domain).map((item) => item.name),
    suggestedLearningPath: getStudyPreparation(config.domain).roadmap,
  };
}

function normalizeFinalReport(parsed, fallback) {
  return {
    overallScore: Number(parsed?.overallScore ?? parsed?.overall_score ?? fallback.overallScore),
    communication: Number(parsed?.communication ?? fallback.communication),
    technicalSkills: Number(parsed?.technicalSkills ?? parsed?.technical_skills ?? fallback.technicalSkills),
    confidence: Number(parsed?.confidence ?? fallback.confidence),
    problemSolving: Number(parsed?.problemSolving ?? parsed?.problem_solving ?? fallback.problemSolving),
    strengths: Array.isArray(parsed?.strengths) ? parsed.strengths : fallback.strengths,
    weaknesses: Array.isArray(parsed?.weaknesses) ? parsed.weaknesses : fallback.weaknesses,
    idealAnswer: parsed?.idealAnswer || parsed?.ideal_answer || fallback.idealAnswer,
    recommendedCertifications: Array.isArray(parsed?.recommendedCertifications) ? parsed.recommendedCertifications : fallback.recommendedCertifications,
    suggestedLearningPath: Array.isArray(parsed?.suggestedLearningPath) ? parsed.suggestedLearningPath : fallback.suggestedLearningPath,
  };
}

export function getStoredApiKey() {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || "";
}

export function saveApiKey(apiKey) {
  if (apiKey) {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    return;
  }

  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export async function getConversationalInterviewTurn(conversation, config) {
  const fallback = buildFallbackTurn(conversation, config);
  const prompt = `${buildInterviewerSystemPrompt(config)}\n\nConversation so far:\n${transcriptFrom(conversation) || "No conversation yet."}\n\nGenerate the next interviewer message. Remember: ask exactly one question and return JSON only.`;

  try {
    const text = await callGemini(prompt, config.apiKey);
    return normalizeInterviewerTurn(safeParseJson(text), fallback);
  } catch (error) {
    console.warn(error.message);
    return fallback;
  }
}

export async function generateFinalInterviewReport(conversation, config) {
  const fallback = fallbackFinalReport(conversation, config);
  const prompt = `${buildInterviewerSystemPrompt(config)}\n\nThe interview is complete. Evaluate the full conversation and return JSON only using schema {"overallScore":8.2,"communication":8.5,"technicalSkills":8.0,"confidence":7.8,"problemSolving":8.4,"strengths":["..."],"weaknesses":["..."],"idealAnswer":"...","recommendedCertifications":["..."],"suggestedLearningPath":["..."]}.\n\nConversation:\n${transcriptFrom(conversation)}`;

  try {
    const text = await callGemini(prompt, config.apiKey);
    return normalizeFinalReport(safeParseJson(text), fallback);
  } catch (error) {
    console.warn(error.message);
    return fallback;
  }
}

// Backward-compatible wrappers used by the existing quiz/practice modules.
export async function generateInterviewQuestions(config) {
  const openingTurn = await getConversationalInterviewTurn([], config);
  return [
    {
      id: crypto.randomUUID(),
      question: openingTurn.message,
      domain: config.domain,
      language: config.language,
      difficulty: config.difficulty,
      type: config.questionType,
      idealAnswer: `Give a structured answer connected to ${config.domain}, ${config.language}, and your real experience.`,
      topic: openingTurn.focusArea,
    },
  ];
}

export async function evaluateInterviewAnswer(question, answer, config) {
  const conversation = [
    { role: "assistant", content: question.question, focusArea: question.topic || question.domain },
    { role: "user", content: answer || "No answer provided." },
  ];
  const report = await generateFinalInterviewReport(conversation, config);

  return {
    score: Math.round(report.overallScore * 10),
    strengths: report.strengths,
    weaknesses: report.weaknesses,
    idealAnswer: report.idealAnswer,
  };
}

export function getStudyPreparation(domain) {
  const skills = skillsFor(domain);
  return {
    roadmap: [
      `Master fundamentals: ${skills[0]} and ${skills[1]}.`,
      `Build two portfolio projects demonstrating ${skills[2]}.`,
      `Practice conversational interviews and explain trade-offs aloud.`,
    ],
    checklist: ["Resume pitch prepared", "STAR stories drafted", "Technical basics revised", "Questions for interviewer ready"],
    recommendations: skills.map((skill) => `Revise ${skill} with notes, examples, and one mini-project.`),
  };
}

export function getCertificationRecommendations(domain) {
  const certifications = certificationMap[domain] || certificationMap["Software Engineer"];
  return certifications.map((name) => ({
    name,
    resource: `Search official ${name} curriculum and complete one practice assessment before interviews.`,
  }));
}

export function getInterviewHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveInterviewResult(result) {
  const history = getInterviewHistory();
  const nextHistory = [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...result }, ...history].slice(0, 25);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  return nextHistory;
}

export function getAnalytics() {
  const history = getInterviewHistory();
  const total = history.length;
  const averageScore = total ? Math.round(history.reduce((sum, item) => sum + Number(item.score || 0), 0) / total) : 0;
  const skillCounts = history.reduce((counts, item) => {
    const topic = item.topic || item.domain || "General";
    counts[topic] = (counts[topic] || 0) + (Number(item.score || 0) < 70 ? 1 : 0);
    return counts;
  }, {});
  const skillGaps = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);

  return { total, averageScore, skillGaps, history };
}

export function buildPrintableReport(result) {
  const certifications = result.recommendedCertifications?.length
    ? result.recommendedCertifications.map((name) => ({ name, resource: "Recommended by your AI Live Interview report." }))
    : getCertificationRecommendations(result.domain);
  const strengths = (result.strengths || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>Keep practicing to unlock insights.</li>";
  const weaknesses = (result.weaknesses || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>No weaknesses recorded.</li>";
  const certList = certifications.map((item) => `<li><strong>${escapeHtml(item.name)}</strong> — ${escapeHtml(item.resource)}</li>`).join("");
  const learningPath = (result.suggestedLearningPath || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  return `
    <html>
      <head><title>Intervoxa AI Live Interview Report</title></head>
      <body style="font-family:Arial,sans-serif;line-height:1.6;padding:32px;color:#111827;">
        <h1>Intervoxa AI Live Interview Report</h1>
        <p><strong>Role:</strong> ${escapeHtml(result.domain)} | <strong>Experience:</strong> ${escapeHtml(result.experience)} | <strong>Language:</strong> ${escapeHtml(result.language)}</p>
        <h2>Overall Score: ${escapeHtml(result.overallScore)}/10</h2>
        <p><strong>Communication:</strong> ${escapeHtml(result.communication)}/10 | <strong>Technical Skills:</strong> ${escapeHtml(result.technicalSkills)}/10 | <strong>Confidence:</strong> ${escapeHtml(result.confidence)}/10 | <strong>Problem Solving:</strong> ${escapeHtml(result.problemSolving)}/10</p>
        <h3>Conversation Summary</h3><p>${escapeHtml(result.summary || "Conversational interview completed with context-aware follow-up questions.")}</p>
        <h3>Strengths</h3><ul>${strengths}</ul>
        <h3>Weaknesses</h3><ul>${weaknesses}</ul>
        <h3>Ideal Answer Strategy</h3><p>${escapeHtml(result.idealAnswer || "Use structured, specific answers with examples, trade-offs, and impact.")}</p>
        <h3>Certification Suggestions</h3><ul>${certList}</ul>
        <h3>Suggested Learning Path</h3><ol>${learningPath}</ol>
      </body>
    </html>`;
}
