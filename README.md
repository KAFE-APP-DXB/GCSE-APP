# Study Loop — standalone GCSE practice

This is a static website for iPad Safari and other modern browsers. It has original Physics and Business practice questions, feedback on each answer, ten-question rounds and a review of missed questions. It does not require ChatGPT, a paid subscription, a server, or a sign-in. The questions are original practice material aligned to introductory AQA GCSE topics, not copies of exam papers.

## Live app

Open https://gcse-study-loop-open.info430213.chatgpt.site in Safari. This public student link is hosted on a separate domain and requires no ChatGPT or GitHub sign-in. The web app does not connect to the GitHub account or any repository.

## Optional GitHub Pages

The static files are at the repository root. If you later decide to publish directly through GitHub, in **Settings → Pages** choose **Deploy from a branch**, branch **main**, folder **/(root)**, then save. GitHub will show the URL in Pages settings. Project sites under the same GitHub owner can share browser storage at the github.io origin. Do not store credentials in any browser-based Pages project; the separate live link above avoids that shared origin.

The site does not contain a GitHub token, deploy key, API connection, private project data, or code that accesses any repository. It reads its own question bank, and stores learning progress on the student's device. The service worker is restricted to this app's path. Keep credentials and personal information out of this repository, which is public.

On iPad, open the published site in Safari and use **Share → Add to Home Screen**. Open it online once before relying on the offline cache.

All app URLs, the manifest scope and service-worker registration are relative, so the same files work at a GitHub Pages repository path such as `/gcse-study-loop/`. The initial visit needs internet access. After the service worker has cached the site, previously loaded practice should work offline; the external past-papers link still needs internet access. Answers and progress are stored only in that browser on that device. They do not sync between devices or Safari profiles; clearing website data removes them.

To update questions, edit `questions.js` and increment the cache version in `sw.js` (for example `static-v2` to `static-v3`) so existing installations receive the changes. Ensure each question has four choices, a valid `correctIndex`, feedback for each wrong choice, and a worked explanation.

## Local preview

From this directory run `python3 -m http.server 8000` and open `http://localhost:8000/` on the same computer. GitHub Pages supplies HTTPS for the published version, enabling the service worker on the iPad.
