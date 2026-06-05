import {
  buildPrintableReport,
  difficultyOptions,
  domainOptions,
  evaluateInterviewAnswer,
  generateInterviewQuestions,
  getCertificationRecommendations,
  getStoredApiKey,
  getStudyPreparation,
  languageOptions,
  questionTypeOptions,
  saveApiKey,
  saveInterviewResult,
} from "../services/geminiService.js";

const coachRoot = document.querySelector("#voiceCoach");
const domainSelect = document.querySelector("#coachDomain");
const languageSelect = document.querySelector("#coachLanguage");
const difficultySelect = document.querySelector("#coachDifficulty");
const typeSelect = document.querySelector("#coachQuestionType");
const apiKeyInput = document.querySelector("#geminiApiKey");
const generateButton = document.querySelector("#generateInterviewButton");
const speakButton = document.querySelector("#speakQuestionButton");
const micButton = document.querySelector("#micButton");
const evaluateButton = document.querySelector("#evaluateAnswerButton");
const nextButton = document.querySelector("#nextCoachQuestionButton");
const reportButton = document.querySelector("#downloadReportButton");
const transcriptInput = document.querySelector("#coachTranscript");
const statusText = document.querySelector("#coachStatus");
const questionText = document.querySelector("#coachQuestionText");
const questionMeta = document.querySelector("#coachQuestionMeta");
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
  questions: [],
  currentIndex: 0,
  latestEvaluation: null,
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
  renderList(roadmapList, preparation.roadmap, "Generate an interview to see a roadmap.");
  renderList(checklistList, preparation.checklist, "Checklist will appear here.");
  renderList(topicList, preparation.recommendations, "Topic recommendations will appear here.");

  if (certificationList) {
    certificationList.innerHTML = certifications
      .map((item) => `<li><strong>${item.name}</strong><span>${item.resource}</span></li>`)
      .join("");
  }
}

function currentQuestion() {
  return state.questions[state.currentIndex];
}

function renderQuestion() {
  const question = currentQuestion();

  if (!question) {
    questionText.textContent = "Generate questions to begin your voice interview.";
    questionMeta.textContent = "No active question";
    return;
  }

  questionText.textContent = question.question;
  questionMeta.textContent = `Question ${state.currentIndex + 1} of ${state.questions.length} • ${question.domain} • ${question.language} • ${question.difficulty} • ${question.type}`;
  transcriptInput.value = "";
  state.latestEvaluation = null;
  renderEvaluation(null);
}

function renderEvaluation(evaluation) {
  scoreValue.textContent = evaluation ? `${evaluation.score}/100` : "--";
  renderList(strengthsList, evaluation?.strengths, "Submit an answer to see strengths.");
  renderList(weaknessesList, evaluation?.weaknesses, "Submit an answer to see improvement areas.");
  idealAnswerText.textContent = evaluation?.idealAnswer || "Gemini or the mock evaluator will show an ideal answer after evaluation.";
  reportButton.disabled = !evaluation;
}

function getConfig() {
  const apiKey = apiKeyInput.value.trim();
  saveApiKey(apiKey);

  return {
    domain: domainSelect.value,
    language: languageSelect.value,
    difficulty: difficultySelect.value,
    questionType: typeSelect.value,
    apiKey,
  };
}

function setActionState(isGenerating) {
  coachRoot?.classList.toggle("is-loading", isGenerating);
  generateButton.disabled = isGenerating;
  speakButton.disabled = isGenerating || !currentQuestion();
  micButton.disabled = isGenerating || !currentQuestion() || !SpeechRecognition;
  evaluateButton.disabled = isGenerating || !currentQuestion();
  nextButton.disabled = isGenerating || state.questions.length < 2;
}

async function generateInterview() {
  state.config = getConfig();
  setActionState(true);
  setStatus("Generating AI interview questions...", true);

  state.questions = await generateInterviewQuestions(state.config);
  state.currentIndex = 0;
  renderQuestion();
  renderStudyHub(state.config.domain);
  setActionState(false);
  setStatus(state.config.apiKey ? "Gemini interview ready." : "Mock AI interview ready. Add a Gemini key for live AI generation.");
}

function speakCurrentQuestion() {
  const question = currentQuestion();

  if (!question || !window.speechSynthesis) {
    setStatus("Text-to-Speech is not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(question.question);
  utterance.rate = 0.92;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  setStatus("AI interviewer is asking the question aloud.");
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
  setStatus("Listening... speak your answer naturally.");

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

async function evaluateAnswer() {
  const question = currentQuestion();

  if (!question) return;

  const answer = transcriptInput.value.trim();
  setStatus("Evaluating answer with AI coach...", true);
  evaluateButton.disabled = true;

  const evaluation = await evaluateInterviewAnswer(question, answer, state.config || getConfig());
  state.latestEvaluation = evaluation;
  renderEvaluation(evaluation);
  saveInterviewResult({
    domain: question.domain,
    language: question.language,
    difficulty: question.difficulty,
    question: question.question,
    answer,
    topic: question.topic,
    score: evaluation.score,
    strengths: evaluation.strengths,
    weaknesses: evaluation.weaknesses,
    idealAnswer: evaluation.idealAnswer,
  });
  evaluateButton.disabled = false;
  setStatus("Evaluation saved to local dashboard history.");
}

function nextQuestion() {
  if (!state.questions.length) return;
  state.currentIndex = (state.currentIndex + 1) % state.questions.length;
  renderQuestion();
  setActionState(false);
  setStatus("Next interview question loaded.");
}

function downloadReport() {
  const question = currentQuestion();

  if (!question || !state.latestEvaluation) {
    setStatus("Evaluate an answer before generating a report.");
    return;
  }

  const report = buildPrintableReport({
    ...question,
    answer: transcriptInput.value.trim(),
    score: state.latestEvaluation.score,
    strengths: state.latestEvaluation.strengths,
    weaknesses: state.latestEvaluation.weaknesses,
    idealAnswer: state.latestEvaluation.idealAnswer,
  });
  const reportWindow = window.open("", "_blank");

  if (!reportWindow) {
    setStatus("Popup blocked. Allow popups to open the printable PDF report.");
    return;
  }

  reportWindow.document.write(report);
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
}

function initializeCoach() {
  if (!coachRoot) return;

  fillSelect(domainSelect, domainOptions);
  fillSelect(languageSelect, languageOptions);
  fillSelect(difficultySelect, difficultyOptions);
  fillSelect(typeSelect, questionTypeOptions);
  apiKeyInput.value = getStoredApiKey();
  renderStudyHub(domainSelect.value);
  renderQuestion();
  renderEvaluation(null);
  setActionState(false);

  if (!SpeechRecognition) {
    setStatus("Speech Recognition is unavailable in this browser. Typed answers still work.");
  }
}

generateButton?.addEventListener("click", generateInterview);
speakButton?.addEventListener("click", speakCurrentQuestion);
micButton?.addEventListener("click", startListening);
evaluateButton?.addEventListener("click", evaluateAnswer);
nextButton?.addEventListener("click", nextQuestion);
reportButton?.addEventListener("click", downloadReport);
domainSelect?.addEventListener("change", () => renderStudyHub(domainSelect.value));

initializeCoach();
