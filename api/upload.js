import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned } from "@vercel/blob/client";

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
    const result = await handleUploadPresigned({
      body: req.body,
      request: req,
      getSignedToken: async (pathname) => {
        if (typeof pathname !== "string" || !pathname.startsWith("quiz-uploads/")
          || pathname.includes("..") || pathname.length > 240) {
          throw new Error("Invalid upload path.");
        }
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_BYTES,
          validUntil: Date.now() + 10 * 60 * 1000,
        });
        return {
          token,
          urlOptions: {
            allowedContentTypes: ALLOWED_TYPES,
            maximumSizeInBytes: MAX_FILE_BYTES,
            validUntil: Date.now() + 10 * 60 * 1000,
            allowOverwrite: false,
          },
        };
      },
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Upload authorization failed." });
  }
}
