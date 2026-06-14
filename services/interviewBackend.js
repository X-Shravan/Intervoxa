const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

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

const companyGuidance = {
  Google: "Emphasize product thinking, clarity, trade-offs, and scalable reasoning.",
  Amazon: "Stress customer obsession, ownership, deep dives, and leadership principles.",
  Microsoft: "Focus on collaboration, growth mindset, enterprise impact, and inclusive engineering.",
  Infosys: "Highlight delivery, client communication, service mindset, and structured problem solving.",
  TCS: "Highlight dependable execution, teamwork, adaptability, and business understanding.",
  Wipro: "Show practical delivery, quality awareness, and client-focused communication.",
  Accenture: "Balance consulting clarity with technical depth and stakeholder communication.",
  Capgemini: "Demonstrate consulting mindset, adaptability, and clear technical justification.",
};

function safeParseJson(text) {
  const trimmed = String(text || "").trim().replace(/^```json|```$/g, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : null;
  }
}

function skillsFor(domain) {
  return domainSkills[domain] || domainSkills["Software Engineer"];
}

function certificationRecommendations(domain) {
  return (certificationMap[domain] || certificationMap["Software Engineer"]).map((name) => ({
    name,
    resource: `Search the official ${name} curriculum and complete one practice assessment before interviews.`,
  }));
}

function studyPreparation(domain) {
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

function transcriptFrom(conversation) {
  return conversation.map((turn) => `${turn.role === "assistant" ? "Interviewer" : "Candidate"}: ${turn.content}`).join("\n");
}

function buildSystemPrompt(config) {
  const company = config.company && config.company !== "Any Company" ? config.company : "a generic company";
  const personality = config.personality || "Friendly";
  const resumeText = String(config.resumeText || "").slice(0, 1200);

  return `You are a senior human interviewer for Intervoxa AI.
Candidate name: ${config.candidateName || "Candidate"}.
Role: ${config.domain}.
Target company mode: ${company}.
Interviewer personality: ${personality}.
Experience: ${config.experience}.
Programming language: ${config.language}.
Interview type: ${config.questionType}.
Difficulty: ${config.difficulty}.
Stress interview mode: ${config.stressMode ? "enabled" : "disabled"}.
Resume context: ${resumeText || "No resume provided."}

Conduct a realistic conversational interview.
Rules:
1. Ask only one question at a time.
2. Ask relevant follow-ups using the conversation history.
3. Challenge vague or incomplete answers.
4. Ask for examples, trade-offs, and impact.
5. Return JSON only using this schema: {"message":"next interviewer response","focusArea":"topic","shouldEnd":false}.`;
}

function buildFallbackTurn(conversation, config) {
  const candidateTurns = conversation.filter((turn) => turn.role === "user");
  const lastAnswer = candidateTurns.at(-1)?.content || "";
  const lowerAnswer = lastAnswer.toLowerCase();
  const skills = skillsFor(config.domain);
  const askedCount = conversation.filter((turn) => turn.role === "assistant").length;
  const companyNote = config.company && companyGuidance[config.company] ? ` for ${config.company}` : "";
  const resumeHint = String(config.resumeText || "").trim().split(/\s+/).slice(0, 12).join(" ");
  const tone = String(config.personality || "Friendly").toLowerCase();
  const prefix = tone === "strict" ? "Be precise. " : tone === "friendly" ? "Nice. " : "";

  if (askedCount === 0) {
    return {
      message: `Hello ${config.candidateName || "Candidate"}, welcome to your ${config.domain}${companyNote} interview. ${prefix}Please introduce yourself and walk me through one project from your resume or recent experience that best fits this role.`,
      focusArea: "introduction",
      shouldEnd: false,
    };
  }

  if (resumeHint && askedCount === 1) {
    return {
      message: `You mentioned this on your resume: "${resumeHint}". ${prefix}Can you explain the technical details, your exact contribution, and one trade-off you made?`,
      focusArea: "resume deep dive",
      shouldEnd: false,
    };
  }

  if (config.stressMode && lastAnswer.split(/\s+/).filter(Boolean).length < 18) {
    return {
      message: `${prefix}Your answer is too brief. Give me a concrete example, the trade-offs you considered, and the result you achieved.`,
      focusArea: "depth and clarity",
      shouldEnd: false,
    };
  }

  if (/firebase|firestore|realtime database|authentication/.test(lowerAnswer)) {
    return {
      message: `${prefix}You mentioned Firebase. Which Firebase services did you use, and why did you choose that architecture over alternatives such as a custom backend or Realtime Database?`,
      focusArea: "Firebase architecture",
      shouldEnd: false,
    };
  }

  if (/spring boot|spring|java/.test(lowerAnswer) && String(config.domain || "").includes("Backend")) {
    return {
      message: `${prefix}Interesting. Which Spring Boot features did you use most often, and how did they help with maintainability or performance?`,
      focusArea: "Spring Boot depth",
      shouldEnd: false,
    };
  }

  if (/team|conflict|collaborat|group/.test(lowerAnswer) || config.questionType === "HR") {
    return {
      message: `${prefix}Let's explore teamwork. Tell me about a time you had a disagreement in a team. What conflict occurred, how did you resolve it, and what would you do differently now?`,
      focusArea: "behavioral teamwork",
      shouldEnd: false,
    };
  }

  const topic = skills[askedCount % skills.length];
  return {
    message: `${prefix}Let's move deeper into ${topic}. For a ${config.experience} ${config.domain}, explain one practical scenario where ${topic} matters, and include how you would implement or measure it using ${config.language}.${config.company && config.company !== "Any Company" ? ` Tie your answer to ${config.company} priorities if relevant.` : ""}`,
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
  const candidateText = conversation.filter((turn) => turn.role === "user").map((turn) => turn.content).join(" ");
  const words = candidateText.split(/\s+/).filter(Boolean).length;
  const hasExamples = /project|example|built|implemented|created|developed|designed/i.test(candidateText);
  const hasStructure = /first|second|finally|situation|task|action|result|because|therefore|trade-off/i.test(candidateText);
  const technicalMention = new RegExp(skillsFor(config.domain).join("|"), "i").test(candidateText);
  const companyBonus = config.company && config.company !== "Any Company" ? 4 : 0;
  const base = Math.min(88, Math.max(48, words + (hasExamples ? 12 : 0) + (hasStructure ? 10 : 0) + (technicalMention ? 10 : 0) + companyBonus));

  return {
    overallScore: Number((base / 10).toFixed(1)),
    communication: Number((Math.min(95, base + (hasStructure ? 5 : -5)) / 10).toFixed(1)),
    technicalSkills: Number((Math.min(95, base + (technicalMention ? 7 : -8)) / 10).toFixed(1)),
    confidence: Number((Math.min(95, base + (words > 80 ? 5 : -6)) / 10).toFixed(1)),
    problemSolving: Number((Math.min(95, base + (hasExamples ? 6 : -5)) / 10).toFixed(1)),
    strengths: [hasExamples ? "Used project-oriented examples." : "Answered the interviewer's questions directly.", technicalMention ? `${config.domain} fundamentals were mentioned.` : "Showed willingness to explain concepts."],
    weaknesses: [hasStructure ? "Add more measurable impact to answers." : "Use STAR or step-by-step structure more consistently.", technicalMention ? "Go deeper into scalability and trade-offs." : `Revise core ${config.domain} topics before the next round.`],
    idealAnswer: `Strong answers for ${config.domain} should include context, a specific example, ${config.language} implementation details, trade-offs, measurable result, and reflection${config.company && config.company !== "Any Company" ? ` aligned with ${config.company} values` : ""}.`,
    recommendedCertifications: certificationRecommendations(config.domain).map((item) => item.name),
    suggestedLearningPath: studyPreparation(config.domain).roadmap,
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

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API key is missing.");
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
    throw new Error("Gemini request failed.");
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n") || "";
}

async function generateInterviewTurn(conversation = [], config = {}) {
  const fallback = buildFallbackTurn(conversation, config);
  const prompt = `${buildSystemPrompt(config)}\n\nConversation so far:\n${transcriptFrom(conversation) || "No conversation yet."}\n\nGenerate the next interviewer message. Ask exactly one question and return JSON only.`;

  try {
    return normalizeInterviewerTurn(safeParseJson(await callGemini(prompt)), fallback);
  } catch (error) {
    console.warn(error.message);
    return fallback;
  }
}

async function generateFinalInterviewReport(conversation = [], config = {}) {
  const fallback = fallbackFinalReport(conversation, config);
  const prompt = `${buildSystemPrompt(config)}\n\nThe interview is complete. Evaluate the full conversation and return JSON only using schema {"overallScore":8.2,"communication":8.5,"technicalSkills":8.0,"confidence":7.8,"problemSolving":8.4,"strengths":["..."],"weaknesses":["..."],"idealAnswer":"...","recommendedCertifications":["..."],"suggestedLearningPath":["..."]}.\n\nConversation:\n${transcriptFrom(conversation)}`;

  try {
    return normalizeFinalReport(safeParseJson(await callGemini(prompt)), fallback);
  } catch (error) {
    console.warn(error.message);
    return fallback;
  }
}

module.exports = {
  generateInterviewTurn,
  generateFinalInterviewReport,
  certificationRecommendations,
  studyPreparation,
};