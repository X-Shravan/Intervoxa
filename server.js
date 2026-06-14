require("dotenv").config();

const express = require("express");
const path = require("node:path");
const { generateInterviewTurn, generateFinalInterviewReport } = require("./services/interviewBackend");

const port = process.env.PORT || 3000;
const publicRoot = process.cwd();
const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicRoot, { extensions: ["html"] }));

app.post("/api/interview/turn", async (request, response) => {
  try {
    const { conversation = [], config = {} } = request.body || {};
    response.json(await generateInterviewTurn(conversation, config));
  } catch (error) {
    response.status(500).json({ error: error.message || "Unable to generate interview turn." });
  }
});

app.post("/api/interview/report", async (request, response) => {
  try {
    const { conversation = [], config = {} } = request.body || {};
    response.json(await generateFinalInterviewReport(conversation, config));
  } catch (error) {
    response.status(500).json({ error: error.message || "Unable to generate interview report." });
  }
});

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

app.use((_request, response) => {
  response.status(404).sendFile(path.join(publicRoot, "index.html"));
});

app.listen(port, () => {
  console.log(`Intervoxa landing page running at http://localhost:${port}`);
});
