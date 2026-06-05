import { fetchCategories, getQuestionByCategory } from "../services/interviewApi.js";

const quizRoot = document.querySelector("#quizModule");
const categorySelect = document.querySelector("#quizCategory");
const difficultySelect = document.querySelector("#quizDifficulty");
const startButton = document.querySelector("#startQuizButton");
const quizSetup = document.querySelector("#quizSetup");
const quizPanel = document.querySelector("#quizPanel");
const resultPanel = document.querySelector("#resultPanel");
const questionCounter = document.querySelector("#questionCounter");
const quizProgress = document.querySelector("#quizProgress");
const timerDisplay = document.querySelector("#quizTimer");
const questionCategory = document.querySelector("#questionCategory");
const questionDifficulty = document.querySelector("#questionDifficulty");
const questionText = document.querySelector("#questionText");
const answerList = document.querySelector("#answerList");
const previousButton = document.querySelector("#previousQuestionButton");
const nextButton = document.querySelector("#nextQuestionButton");
const totalQuestionsResult = document.querySelector("#totalQuestionsResult");
const correctAnswersResult = document.querySelector("#correctAnswersResult");
const wrongAnswersResult = document.querySelector("#wrongAnswersResult");
const percentageResult = document.querySelector("#percentageResult");
const performanceResult = document.querySelector("#performanceResult");
const restartButton = document.querySelector("#restartQuizButton");
const quizStatus = document.querySelector("#quizStatus");

const state = {
  questions: [],
  answers: [],
  currentIndex: 0,
  secondsRemaining: 0,
  timerId: null,
};

function setStatus(message, type = "info") {
  if (!quizStatus) return;
  quizStatus.textContent = message;
  quizStatus.dataset.type = type;
}

function setView(viewName) {
  quizSetup?.classList.toggle("is-hidden", viewName !== "setup");
  quizPanel?.classList.toggle("is-hidden", viewName !== "quiz");
  resultPanel?.classList.toggle("is-hidden", viewName !== "result");
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getTimerLength(difficulty) {
  const timerMap = {
    Easy: 90,
    Medium: 120,
    Hard: 150,
  };
  return timerMap[difficulty] || 120;
}

function updateTimer() {
  if (timerDisplay) {
    timerDisplay.textContent = formatTime(state.secondsRemaining);
  }

  if (state.secondsRemaining <= 0) {
    showResults();
    return;
  }

  state.secondsRemaining -= 1;
}

function startTimer(difficulty) {
  window.clearInterval(state.timerId);
  state.secondsRemaining = getTimerLength(difficulty);
  updateTimer();
  state.timerId = window.setInterval(updateTimer, 1000);
}

function getPerformanceLevel(percentage) {
  if (percentage >= 85) return "Excellent - interview ready";
  if (percentage >= 70) return "Strong - keep refining answers";
  if (percentage >= 50) return "Developing - revise weak areas";
  return "Needs practice - restart with Easy questions";
}

function calculateScore() {
  const correct = state.questions.reduce((score, question, index) => {
    return state.answers[index] === question.correctAnswer ? score + 1 : score;
  }, 0);
  const total = state.questions.length;
  const wrong = total - correct;
  const percentage = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, wrong, percentage };
}

function renderQuestion() {
  const question = state.questions[state.currentIndex];
  const currentAnswer = state.answers[state.currentIndex];
  const progressPercentage = Math.round(((state.currentIndex + 1) / state.questions.length) * 100);

  questionCounter.textContent = `Question ${state.currentIndex + 1} of ${state.questions.length}`;
  quizProgress.style.width = `${progressPercentage}%`;
  questionCategory.textContent = question.category;
  questionDifficulty.textContent = question.difficulty;
  questionText.textContent = question.question;
  answerList.innerHTML = "";

  question.options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-option";
    button.textContent = option;
    button.setAttribute("aria-pressed", String(currentAnswer === option));
    button.addEventListener("click", () => {
      state.answers[state.currentIndex] = option;
      renderQuestion();
    });
    answerList.append(button);
  });

  previousButton.disabled = state.currentIndex === 0;
  nextButton.textContent = state.currentIndex === state.questions.length - 1 ? "Finish Quiz" : "Next Question";
}

async function populateCategories() {
  if (!categorySelect) return;
  const categories = await fetchCategories();
  categorySelect.innerHTML = categories.map((category) => `<option value="${category}">${category}</option>`).join("");
}

async function startQuiz() {
  const category = categorySelect.value;
  const difficulty = difficultySelect.value;

  startButton.disabled = true;
  setStatus("Loading interview questions...", "loading");
  quizRoot?.classList.add("is-loading");

  try {
    const questions = await getQuestionByCategory(category, difficulty, 5);
    state.questions = questions;
    state.answers = Array.from({ length: questions.length }, () => null);
    state.currentIndex = 0;
    setStatus("Quiz started. Choose the best answer for each question.", "success");
    setView("quiz");
    renderQuestion();
    startTimer(difficulty);
  } catch (error) {
    setStatus(error.message || "Questions could not be loaded. Please retry.", "error");
  } finally {
    startButton.disabled = false;
    quizRoot?.classList.remove("is-loading");
  }
}

function showResults() {
  window.clearInterval(state.timerId);
  const score = calculateScore();

  totalQuestionsResult.textContent = score.total;
  correctAnswersResult.textContent = score.correct;
  wrongAnswersResult.textContent = score.wrong;
  percentageResult.textContent = `${score.percentage}%`;
  performanceResult.textContent = getPerformanceLevel(score.percentage);
  setStatus("Quiz completed. Review your score and try another category.", "success");
  setView("result");
}

previousButton?.addEventListener("click", () => {
  if (state.currentIndex > 0) {
    state.currentIndex -= 1;
    renderQuestion();
  }
});

nextButton?.addEventListener("click", () => {
  if (state.currentIndex === state.questions.length - 1) {
    showResults();
    return;
  }

  state.currentIndex += 1;
  renderQuestion();
});

startButton?.addEventListener("click", startQuiz);
restartButton?.addEventListener("click", () => {
  window.clearInterval(state.timerId);
  setStatus("Choose a category and difficulty to start again.", "info");
  setView("setup");
});

if (quizRoot) {
  populateCategories();
  setView("setup");
}
