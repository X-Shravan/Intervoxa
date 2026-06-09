import {
  buildPrintableReport,
  difficultyOptions,
  domainOptions,
  experienceOptions,
  generateFinalInterviewReport,
  getCertificationRecommendations,
  getConversationalInterviewTurn,
  getStoredApiKey,
  getStudyPreparation,
  languageOptions,
  questionTypeOptions,
  saveApiKey,
  saveInterviewResult,
} from "../services/geminiService.js";

const coachRoot = document.querySelector("#voiceCoach");
const candidateNameInput = document.querySelector("#candidateName");
const domainSelect = document.querySelector("#coachDomain");
const experienceSelect = document.querySelector("#coachExperience");
const languageSelect = document.querySelector("#coachLanguage");
const difficultySelect = document.querySelector("#coachDifficulty");
const typeSelect = document.querySelector("#coachQuestionType");
const stressModeToggle = document.querySelector("#stressMode");
const apiKeyInput = document.querySelector("#geminiApiKey");
const startButton = document.querySelector("#generateInterviewButton");
const speakButton = document.querySelector("#speakQuestionButton");
const micButton = document.querySelector("#micButton");
const sendButton = document.querySelector("#evaluateAnswerButton");
const endButton = document.querySelector("#nextCoachQuestionButton");
const reportButton = document.querySelector("#downloadReportButton");
const transcriptInput = document.querySelector("#coachTranscript");
const statusText = document.querySelector("#coachStatus");
const questionText = document.querySelector("#coachQuestionText");
const questionMeta = document.querySelector("#coachQuestionMeta");
const conversationLog = document.querySelector("#conversationLog");
const scoreValue = document.querySelector("#scoreValue");
const strengthsList = document.querySelector("#strengthsList");
const weaknessesList = document.querySelector("#weaknessesList");
const idealAnswerText = document.querySelector("#idealAnswerText");
const roadmapList = document.querySelector("#roadmapList");
const checklistList = document.querySelector("#checklistList");
const topicList = document.querySelector("#topicList");
const certificationList = document.querySelector("#certificationList");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

const state = {
  config: null,
  conversation: [],
  latestTurn: null,
  finalReport: null,
  isListening: false,
};

function setStatus(message, isLoading = false) {
  if (!statusText) return;
  statusText.textContent = message;
  statusText.classList.toggle("loading", isLoading);
}

function fillSelect(select, options) {
  if (!select) return;
  select.innerHTML = options.map((option) => `<option value="${option}">${option}</option>`).join("");
}

function renderList(list, items, fallback) {
  if (!list) return;
  const safeItems = items?.length ? items : [fallback];
  list.innerHTML = safeItems.map((item) => `<li>${item}</li>`).join("");
}

function renderStudyHub(domain) {
  const preparation = getStudyPreparation(domain);
  const certifications = getCertificationRecommendations(domain);
  renderList(roadmapList, preparation.roadmap, "Start an AI Live Interview to see a roadmap.");
  renderList(checklistList, preparation.checklist, "Checklist will appear here.");
  renderList(topicList, preparation.recommendations, "Topic recommendations will appear here.");

  if (certificationList) {
    certificationList.innerHTML = certifications
      .map((item) => `<li><strong>${item.name}</strong><span>${item.resource}</span></li>`)
      .join("");
  }
}

function getConfig() {
  const apiKey = apiKeyInput.value.trim();
  saveApiKey(apiKey);

  return {
    candidateName: candidateNameInput.value.trim() || "Candidate",
    domain: domainSelect.value,
    experience: experienceSelect.value,
    language: languageSelect.value,
    difficulty: difficultySelect.value,
    questionType: typeSelect.value,
    stressMode: stressModeToggle.checked,
    apiKey,
  };
}

function activeAssistantMessage() {
  const assistantTurns = state.conversation.filter((turn) => turn.role === "assistant");
  return state.latestTurn?.message || assistantTurns.at(-1)?.content || "";
}

function renderConversation() {
  if (!conversationLog) return;

  if (!state.conversation.length) {
    conversationLog.innerHTML = '<li class="conversation-empty">Start the AI Live Interview to see the conversation memory.</li>';
    return;
  }

  conversationLog.innerHTML = state.conversation
    .map(
      (turn) => `
        <li class="conversation-turn ${turn.role === "assistant" ? "is-ai" : "is-user"}">
          <span>${turn.role === "assistant" ? "AI Interviewer" : "Candidate"}</span>
          <p>${turn.content}</p>
        </li>
      `,
    )
    .join("");
  conversationLog.scrollTop = conversationLog.scrollHeight;
}

function renderActiveTurn() {
  const message = activeAssistantMessage();

  questionText.textContent = message || "Start an AI Live Interview to begin a natural interviewer-candidate conversation.";
  questionMeta.textContent = state.config
    ? `${state.config.domain} • ${state.config.experience} • ${state.config.language} • ${state.config.questionType}${state.config.stressMode ? " • Stress Mode" : ""}`
    : "No active interview";
  renderConversation();
}

function renderEvaluation(report) {
  scoreValue.textContent = report ? `${report.overallScore}/10` : "--";
  renderList(strengthsList, report?.strengths, "End the interview to see strengths.");
  renderList(weaknessesList, report?.weaknesses, "End the interview to see improvement areas.");
  idealAnswerText.textContent = report?.idealAnswer || "End the conversational interview to receive an ideal answer strategy and full feedback.";
  reportButton.disabled = !report;
}

function setActionState(isBusy) {
  const hasActiveInterview = state.conversation.some((turn) => turn.role === "assistant");
  coachRoot?.classList.toggle("is-loading", isBusy);
  startButton.disabled = isBusy;
  speakButton.disabled = isBusy || !hasActiveInterview;
  micButton.disabled = isBusy || !hasActiveInterview || !SpeechRecognition;
  sendButton.disabled = isBusy || !hasActiveInterview;
  endButton.disabled = isBusy || !hasActiveInterview;
}

async function requestInterviewerTurn(isOpening = false) {
  const turn = await getConversationalInterviewTurn(state.conversation, state.config);
  state.latestTurn = turn;
  state.conversation.push({ role: "assistant", content: turn.message, focusArea: turn.focusArea });
  renderActiveTurn();

  if (!isOpening && turn.shouldEnd) {
    setStatus("The interviewer is ready to wrap up. Click End Interview for the final report.");
    return;
  }

  setStatus(isOpening ? "AI Live Interview started. The interviewer asked the first question." : "Follow-up question generated from your answer.");
}

async function startInterview() {
  state.config = getConfig();
  state.conversation = [];
  state.latestTurn = null;
  state.finalReport = null;
  transcriptInput.value = "";
  renderEvaluation(null);
  renderStudyHub(state.config.domain);
  setActionState(true);
  setStatus("Starting conversational AI interviewer...", true);

  await requestInterviewerTurn(true);
  setActionState(false);

  if (!state.config.apiKey) {
    setStatus("Mock conversational interviewer is active. Add a Gemini key for live AI follow-up reasoning.");
  }
}

function speakCurrentQuestion() {
  const message = activeAssistantMessage();

  if (!message || !window.speechSynthesis) {
    setStatus("Text-to-Speech is not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = 0.92;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  setStatus("AI interviewer is speaking the current question.");
}

function stopListening() {
  recognition?.stop();
  state.isListening = false;
  micButton.textContent = "Start Microphone";
}

function startListening() {
  if (!SpeechRecognition) {
    setStatus("Speech-to-text is not supported in this browser. Type your answer instead.");
    return;
  }

  if (state.isListening) {
    stopListening();
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  state.isListening = true;
  micButton.textContent = "Stop Microphone";
  setStatus("Listening... your speech is being converted into transcript text.");

  recognition.addEventListener("result", (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ");
    transcriptInput.value = transcript;
  });

  recognition.addEventListener("end", () => {
    state.isListening = false;
    micButton.textContent = "Start Microphone";
  });

  recognition.start();
}

async function sendCandidateResponse() {
  const answer = transcriptInput.value.trim();

  if (!answer) {
    setStatus("Please speak or type your answer before sending it to the AI interviewer.");
    transcriptInput.focus();
    return;
  }

  if (state.isListening) {
    stopListening();
  }

  state.conversation.push({ role: "user", content: answer });
  transcriptInput.value = "";
  renderConversation();
  setActionState(true);
  setStatus("AI interviewer is listening, analyzing, and preparing a follow-up...", true);

  await requestInterviewerTurn(false);
  setActionState(false);
}

async function endInterview() {
  if (!state.conversation.length) return;

  if (state.isListening) {
    stopListening();
  }

  setActionState(true);
  setStatus("Generating final interview feedback report...", true);

  const report = await generateFinalInterviewReport(state.conversation, state.config || getConfig());
  state.finalReport = report;
  renderEvaluation(report);
  saveInterviewResult({
    domain: state.config.domain,
    experience: state.config.experience,
    language: state.config.language,
    difficulty: state.config.difficulty,
    questionType: state.config.questionType,
    topic: state.latestTurn?.focusArea || state.config.domain,
    score: Math.round(report.overallScore * 10),
    overallScore: report.overallScore,
    communication: report.communication,
    technicalSkills: report.technicalSkills,
    confidence: report.confidence,
    problemSolving: report.problemSolving,
    strengths: report.strengths,
    weaknesses: report.weaknesses,
    idealAnswer: report.idealAnswer,
    recommendedCertifications: report.recommendedCertifications,
    suggestedLearningPath: report.suggestedLearningPath,
    turns: state.conversation.length,
  });
  setActionState(false);
  setStatus("Final report saved to dashboard history. You can now download the PDF report.");
}

function downloadReport() {
  if (!state.finalReport) {
    setStatus("End the interview before generating a report.");
    return;
  }

  const reportWindow = window.open("", "_blank");

  if (!reportWindow) {
    setStatus("Popup blocked. Allow popups to open the printable PDF report.");
    return;
  }

  reportWindow.document.write(
    buildPrintableReport({
      ...state.finalReport,
      ...state.config,
      summary: `${state.conversation.length} conversational turns with context-aware follow-up questioning.`,
    }),
  );
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
}

function initializeCoach() {
  if (!coachRoot) return;

  fillSelect(domainSelect, domainOptions);
  fillSelect(experienceSelect, experienceOptions);
  fillSelect(languageSelect, languageOptions);
  fillSelect(difficultySelect, difficultyOptions);
  fillSelect(typeSelect, questionTypeOptions);
  apiKeyInput.value = getStoredApiKey();
  renderStudyHub(domainSelect.value);
  renderActiveTurn();
  renderEvaluation(null);
  setActionState(false);

  if (!SpeechRecognition) {
    setStatus("Speech Recognition is unavailable in this browser. Typed answers still work.");
  }
}

startButton?.addEventListener("click", startInterview);
speakButton?.addEventListener("click", speakCurrentQuestion);
micButton?.addEventListener("click", startListening);
sendButton?.addEventListener("click", sendCandidateResponse);
endButton?.addEventListener("click", endInterview);
reportButton?.addEventListener("click", downloadReport);
domainSelect?.addEventListener("change", () => renderStudyHub(domainSelect.value));

initializeCoach();
