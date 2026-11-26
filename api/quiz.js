const MODEL = "gemini-3.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function send(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8").send(JSON.stringify(body));
}

function isYoutubeUrl(value) {
  try {
    const url = new URL(value);
    return ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"].includes(url.hostname)
      && (url.protocol === "https:" || url.protocol === "http:");
  } catch {
    return false;
  }
}

function parseModelJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Use POST to create a quiz." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return send(res, 503, { error: "Quiz generation is not configured yet. Add GEMINI_API_KEY in this Vercel project's Environment Variables." });

  const { url, count: requestedCount } = req.body || {};
  const count = Number(requestedCount);
  if (!isYoutubeUrl(url)) return send(res, 400, { error: "Enter a valid YouTube video link." });
  if (![5, 8, 12].includes(count)) return send(res, 400, { error: "Choose 5, 8, or 12 questions." });

  const prompt = `Watch and understand the full public YouTube lesson in the attached video. Create exactly ${count} useful multiple-choice questions that test the lesson's real concepts, not trivia about the video. Use the same language as the lesson for every question, option, explanation, title, and summary. For each question, provide four distinct options, answerIndex from 0 to 3, and an explanations array of four short entries explaining why each corresponding option is wrong or correct using the lesson. Give the approximate timestamp in seconds where the concept is explained. Return only valid JSON with this shape: {"title":"...","summary":"...","questions":[{"question":"...","options":["...","...","...","..."],"answerIndex":0,"explanations":["...","...","...","..."],"seconds":0}]}.`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { fileData: { mimeType: "video/*", fileUri: url } },
          ],
        }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(240_000),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || "Gemini could not process this video.";
      return send(res, response.status === 429 ? 429 : 502, { error: message });
    }

    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
    if (!text) return send(res, 502, { error: "Gemini returned no quiz. Try a shorter public video." });
    const quiz = parseModelJson(text);
    if (!Array.isArray(quiz.questions) || quiz.questions.length !== count) {
      return send(res, 502, { error: "Gemini returned an incomplete quiz. Please try again." });
    }

    for (const q of quiz.questions) {
      if (typeof q.question !== "string" || !Array.isArray(q.options) || q.options.length !== 4
        || !Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3
        || !Array.isArray(q.explanations) || q.explanations.length !== 4) {
        return send(res, 502, { error: "Gemini returned a quiz in an unexpected format. Please try again." });
      }
      q.seconds = Math.max(0, Number(q.seconds) || 0);
    }
    return send(res, 200, quiz);
  } catch (error) {
    const timeout = error?.name === "TimeoutError" || error?.name === "AbortError";
    return send(res, timeout ? 504 : 502, {
      error: timeout ? "This video took too long to process. Try a shorter lesson." : "Quiz generation failed. Please try again.",
    });
  }
}

