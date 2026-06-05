// Gemini-ready service layer for the voice interview coach.
// The UI can use mock responses without a key, then switch to Gemini by saving an API key.
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
  "Software Engineer": ["Meta Back-End Developer", "AWS Certified Developer", "Oracle Java Foundations"],
  "Frontend Developer": ["Meta Front-End Developer", "Google UX Design", "freeCodeCamp Responsive Web Design"],
  "Backend Developer": ["AWS Certified Developer", "PostgreSQL Associate", "Oracle Java Professional"],
  "Full Stack Developer": ["IBM Full Stack Software Developer", "MongoDB Associate Developer", "AWS Cloud Practitioner"],
  "Android Developer": ["Associate Android Developer", "Kotlin Developer Certification", "Google Play Academy"],
  "AI Engineer": ["Google Machine Learning Engineer", "Microsoft Azure AI Engineer", "DeepLearning.AI TensorFlow Developer"],
  "Data Scientist": ["Google Advanced Data Analytics", "Microsoft Azure Data Scientist", "IBM Data Science Professional"],
  "DevOps Engineer": ["AWS DevOps Engineer", "Docker Certified Associate", "Certified Kubernetes Administrator"],
  "Cyber Security": ["CompTIA Security+", "Google Cybersecurity Certificate", "Certified Ethical Hacker"],
  "HR Interview": ["LinkedIn Interview Prep", "Google Project Management", "Toastmasters Communication Pathways"],
};

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
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
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

function buildFallbackQuestions(config) {
  const skills = domainSkills[config.domain] || domainSkills["Software Engineer"];
  const isHr = config.questionType === "HR" || config.domain === "HR Interview";
  const questionTemplates = isHr
    ? [
        `Tell me about yourself and explain why you are a strong fit for a ${config.domain} role.`,
        `Describe a time you handled feedback or conflict during a project.`,
        `What is one weakness you are actively improving, and how are you measuring progress?`,
      ]
    : [
        `Explain how you would use ${config.language} to solve a practical ${config.domain} problem involving ${skills[0]}.`,
        `Walk me through a project where ${skills[1]} mattered. What trade-offs did you make?`,
        `Design a ${config.difficulty.toLowerCase()}-level solution that demonstrates ${skills[2]} and clear testing strategy.`,
      ];

  return questionTemplates.map((question, index) => ({
    id: crypto.randomUUID(),
    question,
    domain: config.domain,
    language: config.language,
    difficulty: config.difficulty,
    type: isHr ? "HR" : config.questionType,
    idealAnswer: `A strong answer should be structured, specific, and include examples related to ${skills.join(", ")}.`,
    topic: skills[index] || skills[0],
  }));
}

function normalizeQuestions(rawQuestions, config) {
  const questions = Array.isArray(rawQuestions) ? rawQuestions : rawQuestions?.questions;

  if (!Array.isArray(questions) || questions.length === 0) {
    return buildFallbackQuestions(config);
  }

  return questions.slice(0, 5).map((item) => ({
    id: item.id || crypto.randomUUID(),
    question: item.question || item.prompt || "Explain your approach to this interview scenario.",
    domain: item.domain || config.domain,
    language: item.language || config.language,
    difficulty: item.difficulty || config.difficulty,
    type: item.type || config.questionType,
    idealAnswer: item.idealAnswer || item.ideal_answer || "Use a structured answer with examples, trade-offs, and measurable impact.",
    topic: item.topic || config.domain,
  }));
}

function fallbackEvaluation(question, answer, config) {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const hasStructure = /first|second|finally|situation|task|action|result|because|therefore/i.test(answer);
  const mentionsRole = new RegExp(config.domain.split(" ")[0], "i").test(answer);
  const score = Math.min(95, Math.max(35, words.length * 2 + (hasStructure ? 20 : 0) + (mentionsRole ? 10 : 0)));

  return {
    score,
    strengths: [
      words.length > 30 ? "Provided enough detail for evaluation." : "Started with a concise answer.",
      hasStructure ? "Used a structured explanation pattern." : "Answer can be expanded with a STAR or step-by-step format.",
    ],
    weaknesses: [
      words.length < 45 ? "Add more evidence, examples, and measurable impact." : "Connect the answer more directly to business impact.",
      mentionsRole ? "Include deeper technical trade-offs." : `Mention ${config.domain} responsibilities more clearly.`,
    ],
    idealAnswer: question.idealAnswer || `A strong answer should explain the concept, show a ${config.language} example, discuss trade-offs, and finish with impact.`,
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

export async function generateInterviewQuestions(config) {
  const prompt = `Create 5 interview questions as JSON only. Use this schema: {"questions":[{"question":"...","domain":"...","language":"...","difficulty":"...","type":"Technical or HR","topic":"...","idealAnswer":"..."}]}. Role/domain: ${config.domain}. Programming language: ${config.language}. Difficulty: ${config.difficulty}. Question type: ${config.questionType}. Include beginner, medium, or advanced depth based on the selected difficulty.`;

  try {
    const text = await callGemini(prompt, config.apiKey);
    return normalizeQuestions(safeParseJson(text), config);
  } catch (error) {
    console.warn(error.message);
    return buildFallbackQuestions(config);
  }
}

export async function evaluateInterviewAnswer(question, answer, config) {
  const prompt = `Evaluate this mock interview answer as JSON only using schema {"score":0,"strengths":["..."],"weaknesses":["..."],"idealAnswer":"..."}. Role: ${config.domain}. Language: ${config.language}. Difficulty: ${config.difficulty}. Question: ${question.question}. Candidate answer: ${answer || "No answer provided."}`;

  try {
    const text = await callGemini(prompt, config.apiKey);
    const parsed = safeParseJson(text);
    return {
      score: Number(parsed?.score) || 0,
      strengths: Array.isArray(parsed?.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed?.weaknesses) ? parsed.weaknesses : [],
      idealAnswer: parsed?.idealAnswer || parsed?.ideal_answer || question.idealAnswer,
    };
  } catch (error) {
    console.warn(error.message);
    return fallbackEvaluation(question, answer, config);
  }
}

export function getStudyPreparation(domain) {
  const skills = domainSkills[domain] || domainSkills["Software Engineer"];
  return {
    roadmap: [
      `Master fundamentals: ${skills[0]} and ${skills[1]}.`,
      `Build two portfolio projects demonstrating ${skills[2]}.`,
      `Practice mock interviews and explain trade-offs aloud.`,
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
  const certifications = getCertificationRecommendations(result.domain);
  const strengths = result.strengths?.map((item) => `<li>${item}</li>`).join("") || "<li>Keep practicing to unlock insights.</li>";
  const weaknesses = result.weaknesses?.map((item) => `<li>${item}</li>`).join("") || "<li>No weaknesses recorded.</li>";
  const certList = certifications.map((item) => `<li><strong>${item.name}</strong> — ${item.resource}</li>`).join("");

  return `
    <html>
      <head><title>Intervoxa Interview Report</title></head>
      <body style="font-family:Arial,sans-serif;line-height:1.6;padding:32px;color:#111827;">
        <h1>Intervoxa Interview Report</h1>
        <p><strong>Role:</strong> ${result.domain} | <strong>Language:</strong> ${result.language} | <strong>Difficulty:</strong> ${result.difficulty}</p>
        <h2>Score: ${result.score}/100</h2>
        <h3>Question</h3><p>${result.question}</p>
        <h3>Transcript</h3><p>${result.answer || "No transcript captured."}</p>
        <h3>Strengths</h3><ul>${strengths}</ul>
        <h3>Weaknesses</h3><ul>${weaknesses}</ul>
        <h3>Ideal Answer</h3><p>${result.idealAnswer || "Practice a structured, specific answer with examples."}</p>
        <h3>Certification Suggestions</h3><ul>${certList}</ul>
      </body>
    </html>`;
}
