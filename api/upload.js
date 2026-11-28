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
    // Vercel's /api/*.js files use the Node.js Pages API signature.
    // handleUploadPresigned expects a Web Request, so adapt the incoming
    // Node request instead of passing IncomingMessage directly.
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers || {})) {
      if (typeof value === "string") headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(", "));
    }
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const host = headers.get("x-forwarded-host") || headers.get("host") || "localhost";
    const protocol = headers.get("x-forwarded-proto") || "https";
    const requestUrl = new URL(req.url || "/api/upload", `${protocol}://${host}`);
    const webRequest = new Request(requestUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const result = await handleUploadPresigned({
      body: payload,
      request: webRequest,
      getSignedToken: async (pathname) => {
        if (typeof pathname !== "string" || !pathname.startsWith("quiz-uploads/")
          || pathname.includes("..") || pathname.length > 240) {
          throw new Error("Invalid upload path.");
        }

        // The URL expiry must be earlier than the delegation token expiry.
        const delegationValidUntil = Date.now() + 15 * 60 * 1000;
        const uploadValidUntil = Date.now() + 10 * 60 * 1000;
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_BYTES,
          validUntil: delegationValidUntil,
        });

        return {
          token,
          urlOptions: {
            allowedContentTypes: ALLOWED_TYPES,
            maximumSizeInBytes: MAX_FILE_BYTES,
            validUntil: uploadValidUntil,
            allowOverwrite: false,
          },
        };
      },
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("[blob-upload] presigned URL generation failed:", error);
    return res.status(400).json({
      error: error?.message || "Upload authorization failed.",
    });
  }
}
