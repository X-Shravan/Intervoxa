import { fetchCategories, fetchQuestions, getQuestionByCategory } from "../services/interviewApi.js";

const jokeButton = document.querySelector("#jokeButton");
const jokeText = document.querySelector("#jokeText");
const jokeStatus = document.querySelector("#jokeStatus");
const practiceForm = document.querySelector("#practiceForm");
const practiceDomain = document.querySelector("#practiceDomain");
const practiceDifficulty = document.querySelector("#practiceDifficulty");
const practiceCard = document.querySelector("#practiceCard");
const practiceCategory = document.querySelector("#practiceCategory");
const practiceDifficultyLabel = document.querySelector("#practiceDifficultyLabel");
const practiceQuestionText = document.querySelector("#practiceQuestionText");
const practiceAnswer = document.querySelector("#practiceAnswer");
const practiceNextButton = document.querySelector("#practiceNextButton");
const practiceRetryButton = document.querySelector("#practiceRetryButton");
const practiceStatus = document.querySelector("#practiceStatus");
const apiQuestionList = document.querySelector("#apiQuestionList");
const apiQuestionStatus = document.querySelector("#apiQuestionStatus");
const apiRetryButton = document.querySelector("#apiRetryButton");

const practiceState = {
  questions: [],
  index: 0,
};

function setText(element, message, isLoading = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("loading", isLoading);
}

function setPracticeLoading(isLoading) {
  practiceCard?.classList.toggle("is-loading", isLoading);
  practiceForm?.querySelector("button")?.toggleAttribute("disabled", isLoading);
}

async function loadJoke() {
  jokeButton.disabled = true;
  setText(jokeStatus, "Fetching a quick warm-up joke...", true);
  setText(jokeText, "");

  try {
    const response = await fetch("https://official-joke-api.appspot.com/random_joke");

    if (!response.ok) {
      throw new Error("Joke API request failed.");
    }

    const joke = await response.json();
    setText(jokeText, `${joke.setup} ${joke.punchline}`);
    setText(jokeStatus, "Joke loaded from an external API.");
  } catch (error) {
    setText(jokeStatus, `${error.message} Please retry.`);
  } finally {
    jokeButton.disabled = false;
  }
}

function renderPracticeQuestion() {
  const question = practiceState.questions[practiceState.index];

  if (!question) {
    setText(practiceStatus, "No question available for this selection.");
    return;
  }

  setText(practiceCategory, question.category);
  setText(practiceDifficultyLabel, question.difficulty);
  setText(practiceQuestionText, question.question);
  setText(practiceStatus, `Question ${practiceState.index + 1} of ${practiceState.questions.length}`);
  practiceAnswer.value = "";
  practiceCard?.classList.remove("is-hidden");
}

async function generatePracticeQuestions(event) {
  event?.preventDefault();
  const category = practiceDomain?.value || "Java";
  const difficulty = practiceDifficulty?.value || "Easy";

  setPracticeLoading(true);
  setText(practiceStatus, "Generating interview practice questions...", true);

  try {
    practiceState.questions = await getQuestionByCategory(category, difficulty, 5);
    practiceState.index = 0;
    renderPracticeQuestion();
  } catch (error) {
    setText(practiceStatus, error.message || "Could not generate questions. Please retry.");
  } finally {
    setPracticeLoading(false);
  }
}

function nextPracticeQuestion() {
  if (!practiceState.questions.length) return;
  practiceState.index = (practiceState.index + 1) % practiceState.questions.length;
  renderPracticeQuestion();
}

async function hydratePracticeCategories() {
  if (!practiceDomain) return;
  const categories = await fetchCategories();
  practiceDomain.innerHTML = categories.map((category) => `<option value="${category}">${category}</option>`).join("");
}

async function renderApiQuestions(useRemote = false) {
  if (!apiQuestionList) return;

  apiQuestionList.innerHTML = `
    <li class="skeleton-line"></li>
    <li class="skeleton-line"></li>
    <li class="skeleton-line"></li>
  `;
  setText(apiQuestionStatus, "Loading sample interview questions...", true);

  try {
    const questions = await fetchQuestions({ category: "Aptitude", difficulty: "Easy", amount: 3, useRemote });
    apiQuestionList.innerHTML = questions
      .map(
        (question) => `
          <li>
            <strong>${question.category}</strong>
            <span>${question.difficulty}</span>
            <p>${question.question}</p>
          </li>
        `,
      )
      .join("");
    setText(apiQuestionStatus, useRemote ? "Questions loaded from Open Trivia DB." : "Questions loaded from the Intervoxa mock service.");
  } catch (error) {
    apiQuestionList.innerHTML = "";
    setText(apiQuestionStatus, `${error.message} Use retry to load fallback questions.`);
  }
}

jokeButton?.addEventListener("click", loadJoke);
practiceForm?.addEventListener("submit", generatePracticeQuestions);
practiceNextButton?.addEventListener("click", nextPracticeQuestion);
practiceRetryButton?.addEventListener("click", generatePracticeQuestions);
apiRetryButton?.addEventListener("click", () => renderApiQuestions(false));

hydratePracticeCategories();
renderApiQuestions(false);
