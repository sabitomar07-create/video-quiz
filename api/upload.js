import { handleUpload } from "@vercel/blob/client";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
  "application/pdf", "text/plain",
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST to request an upload." });
  }

  try {
    // Vercel Pages API routes provide a parsed body and IncomingMessage.
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ error: "Invalid upload request body." });
    }

    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (typeof pathname !== "string" || !pathname.startsWith("quiz-uploads/")
          || pathname.includes("..") || pathname.length > 240) {
          throw new Error("Invalid upload path.");
        }

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_BYTES,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("[blob-upload] client token generation failed:", error);
    return res.status(400).json({
      error: error?.message || "Upload authorization failed.",
    });
  }
}
