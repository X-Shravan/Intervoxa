// Dynamic Interview Preparation Tracker using DOM manipulation and event listeners.
const taskForm = document.querySelector("#taskForm");
const taskInput = document.querySelector("#taskInput");
const taskList = document.querySelector("#taskList");
const totalTasks = document.querySelector("#totalTasks");
const completedTasks = document.querySelector("#completedTasks");
const pendingTasks = document.querySelector("#pendingTasks");
const progressLabel = document.querySelector("#progressLabel");
const progressBar = document.querySelector("#progressBar");

const tasks = [
  { id: crypto.randomUUID(), title: "Learn HTML", completed: false },
  { id: crypto.randomUUID(), title: "Practice Java Interview", completed: false },
  { id: crypto.randomUUID(), title: "Mock HR Round", completed: true },
  { id: crypto.randomUUID(), title: "Resume Preparation", completed: false },
];

function updateCounters() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = total - completed;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  totalTasks.textContent = total;
  completedTasks.textContent = completed;
  pendingTasks.textContent = pending;
  progressLabel.textContent = `${progress}% complete`;
  progressBar.style.width = `${progress}%`;
}

function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = `task-item${task.completed ? " is-completed" : ""}`;
  item.dataset.taskId = task.id;

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "task-toggle";
  toggleButton.setAttribute("aria-label", `Mark ${task.title} as ${task.completed ? "pending" : "completed"}`);
  toggleButton.textContent = task.completed ? "✓" : "";

  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = task.title;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-task";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${task.title}`);

  item.append(toggleButton, title, deleteButton);
  return item;
}

function renderTasks() {
  taskList.innerHTML = "";

  tasks.forEach((task) => {
    taskList.append(createTaskElement(task));
  });

  updateCounters();
}

function addTask(title) {
  tasks.push({
    id: crypto.randomUUID(),
    title,
    completed: false,
  });
  renderTasks();
}

function toggleTask(id) {
  const task = tasks.find((currentTask) => currentTask.id === id);

  if (task) {
    task.completed = !task.completed;
    renderTasks();
  }
}

function deleteTask(id) {
  const taskIndex = tasks.findIndex((task) => task.id === id);

  if (taskIndex !== -1) {
    tasks.splice(taskIndex, 1);
    renderTasks();
  }
}

taskForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();

  if (!title) {
    taskInput.focus();
    return;
  }

  addTask(title);
  taskInput.value = "";
  taskInput.focus();
});

taskList?.addEventListener("click", (event) => {
  const target = event.target;
  const taskItem = target.closest(".task-item");

  if (!taskItem) {
    return;
  }

  if (target.classList.contains("task-toggle")) {
    toggleTask(taskItem.dataset.taskId);
  }

  if (target.classList.contains("delete-task")) {
    deleteTask(taskItem.dataset.taskId);
  }
});

renderTasks();
