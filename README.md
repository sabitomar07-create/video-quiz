# Video Quiz

Paste a public YouTube lesson or upload photos (JPG, PNG, WEBP, HEIC), PDFs, or TXT files to generate a quiz. Uploads support up to five files and 15 MB total; TXT files are limited to 250 KB each. Choose mixed, multiple-choice, complete-the-verse, or true/false questions. The quiz does not include “what comes next” or arrange/order question styles. Wrong answers are explained, and each question must be answered correctly before continuing. Missed questions return in a review round.

## Long YouTube videos

YouTube lessons are submitted to Gemini through the Interactions API as background jobs. The website polls for the result, so a long analysis no longer has to stay inside one Vercel request. Video analysis uses Gemini 3.8 Flash with static full-video processing, and the quiz prompt asks for coverage across the beginning, middle, and ending of the lesson.

Gemini model context, video duration, account quota, and temporary service availability still apply. The website allows up to 30 minutes for a background job to finish in the browser. Very long videos may take longer or exceed the model/account limits.

## Deploy on Vercel

1. Import this repository into Vercel.
2. Add `GEMINI_API_KEY` to the Vercel project's Production and Preview environment variables.
3. Redeploy.

The key is read only by the serverless function in `api/quiz.js`; do not put it in `index.html` or commit it to GitHub. Revoke any key that was previously shared publicly and use a newly generated key.

Uploaded documents and images continue to use Gemini video-independent content generation. YouTube videos use the background Interactions API flow.
