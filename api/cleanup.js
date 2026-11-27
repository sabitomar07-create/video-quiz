import { del } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
  const paths = Array.isArray(req.body?.pathnames) ? req.body.pathnames : [];
  const safePaths = paths.filter((path) =>
    typeof path === "string" && path.startsWith("quiz-uploads/") && !path.includes("..") && path.length <= 240
  ).slice(0, 5);
  try {
    if (safePaths.length) await del(safePaths);
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Temporary files could not be cleaned up." });
  }
}
