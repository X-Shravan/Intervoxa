import { getAnalytics } from "../services/geminiService.js";

const interviewCount = document.querySelector("#interviewCount");
const averageScore = document.querySelector("#averageScore");
const skillGapList = document.querySelector("#skillGapList");
const historyTable = document.querySelector("#historyTable");

function renderAnalytics() {
  if (!interviewCount || !averageScore || !skillGapList || !historyTable) return;

  const analytics = getAnalytics();
  interviewCount.textContent = analytics.total;
  averageScore.textContent = `${analytics.averageScore}%`;
  skillGapList.innerHTML = analytics.skillGaps.length
    ? analytics.skillGaps.map((gap) => `<li>${gap}</li>`).join("")
    : "<li>Complete a voice interview to discover skill gaps.</li>";
  historyTable.innerHTML = analytics.history.length
    ? analytics.history
        .slice(0, 8)
        .map(
          (item) => `
            <tr>
              <td>${new Date(item.createdAt).toLocaleDateString()}</td>
              <td>${item.domain}</td>
              <td>${item.language}</td>
              <td>${item.score}%</td>
              <td>${item.topic || "General"}</td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="5">No interview history yet. Start a voice interview from the Practice page.</td></tr>';
}

renderAnalytics();
window.addEventListener("storage", renderAnalytics);
