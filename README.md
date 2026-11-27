# Video Quiz

Paste a public YouTube lesson or upload photos (JPG, PNG, WEBP, HEIC), PDFs, or TXT files to generate a multiple-choice quiz. Uploads support up to five files and 2.5 MB total; TXT files are limited to 250 KB each. Wrong answers are explained, and each question must be answered correctly before continuing. Missed questions return in a review round.

## Deploy on Vercel

1. Import this repository into Vercel.
2. Add `GEMINI_API_KEY` to the Vercel project's Production and Preview environment variables.
3. Redeploy.

The key is read only by the serverless function in `api/quiz.js`; do not put it in `index.html` or commit it to GitHub. Revoke any key that was previously shared publicly and use a newly generated key.

The quiz generator uses Gemini video understanding with public YouTube URLs. Availability and limits depend on the Gemini API account and model access.

