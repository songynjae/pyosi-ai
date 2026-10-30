# M6 plan: prepare and submit (DRAFT for approval)

Written 2026-10-29 after reading the hackathon's submission form (Meta Global AI Developer Hackathon, Cerebral Valley). Deadline: **2026-11-04 21:00 ET**. Feature freeze: Friday 2026-10-30; no work over the weekend; Monday and Tuesday are buffer with no new features.

## 1. What the submission form asks for
Required: team name and members, track, problem statement, project description, **public GitHub repository**, **3-minute demo video**, how Meta products were used, why Meta's models matter to the solution, and two opinion questions about Meta Model API. Optional: an X post link (Most Viral Track) and feedback on partner technologies (Fireworks, Modal, Baseten). **There is no deployed-URL field.**
Public event page: the indie developer track is judged on creativity, technical ambition and whether it works; the startup track on technical execution and holding up in production. Proposed track: indie developer. Themes: "Build for Your World" fits best.
Chosen on the form (2026-10-29, owner): **Indie Developer Track**, problem statement **Build for Your World**.
From the hackathon's FAQ (pasted by the owner):
- The repository must be publicly accessible. One submission per team, with a 3-minute demo video, the public repository and every contributor's name; **"Judges assess your video, code and live product."** Late submissions are not considered.
- Judging: first the project must fit the theme and meaningfully use Meta Model API and/or Meta open-weight models; eligible entries are then scored equally on Impact, Use of Meta AI tooling, Technical depth and execution, and Demo quality. The top 5 per track go to the finals.
- A project built on an existing project must clearly identify, and only showcase, what was built during the hackathon; unclear original contributions can lead to disqualification. Using code, data or assets without permission is disqualifying.
- Projects to avoid include "basic RAG apps" and **"simple image analyzers"**.
- Bonus awards: Most Viral (X post of the demo, engagement counted through Nov 8), Best Build on Meta Open Weight Models, Community Vote, Best Agentic Use-Case, Best Creative Build.

## 2. Public deployment on Netlify (decided 2026-10-29)
The form has no deployed-URL field, but the FAQ says "Judges assess your video, code and live product", and the owner decided to deploy (option B) on **Netlify** (the owner's Floraday app is already hosted there). The organizers were not asked. Beta testing with a few invited users is **optional**: it starts only after the deployment is stable and is skipped otherwise.

What the deployment needs (nothing public can spend the owner's key until these are in):
1. **Access control and a call limit on `POST /api/annotate`.** **Implemented 2026-10-29 (`lib/access.ts`, branch `feat/route-protection`):** an access code checked by the route (a code per tester, kept in an environment variable, so one can be removed alone), plus Netlify's rate limit. The Netlify docs describe a per-function `rateLimit` setting (window up to 180 seconds, grouped by IP or domain, answer 429); a support thread suggests it may not apply to a route inside a bundled Next.js app, so it must be tested on a deploy preview before it is relied on. Backstop: a spending limit or budget alert on the Meta account (the owner checks whether the console has one) and removing the environment variable as a kill switch.
2. **Payload size.** Netlify Functions buffer at most 6 MB per request, about 4.5 MB for a binary upload (base64). The app used to accept images up to 10 MB, so images between about 4.5 and 10 MB would have failed. **Done (owner approved 2026-10-29): the limit is 4 MB** (`MAX_IMAGE_BYTES`; the empty state says so; the 2x or padded copy falls back to the original when it would be over the limit).
3. **Time limit.** Synchronous functions stop at 60 seconds, the same as the app's model timeout (60 s). Proposed: set the model timeout to about 50 s so the app answers with its own message before the platform cuts the request.
4. **Next.js 16 on Netlify.** The Netlify adapter supports Next.js 16 and route handlers; this app also uses `cacheComponents`, which was not confirmed in the docs found, so the first deploy preview is the test. Netlify's notice of 2026-09-30 asks for `next` 16.3.8 or newer; the app is on 16.4.3.
5. **Notice on the page** that the screenshot and notes are sent to Meta's model API. **Done (owner approved 2026-10-29):** a muted line under the Generate button: "Your screenshot and notes are sent to Meta's Muse Spark model API to generate the annotations." (no statement about storage: Meta's and the host's retention are not checked yet). The warning not to upload confidential or personal information goes into the beta invitation and the README (Data handling).
6. **Secrets:** `MODEL_API_KEY` is entered by the owner in Netlify's environment settings; Claude has no access to Netlify or the key.
Sources checked 2026-10-29: docs.netlify.com (functions limits, rate limiting) and the Netlify changelog for Next.js 16.

**How the protection works (implemented, tested with unit tests and by calling the real route handler):**
- `ACCESS_CODES` (environment variable on Netlify): `name:code,name:code` (or plain codes). A request needs one in the `x-access-code` header; the page sends the code from the invitation link `https://<site>/?code=<code>` (kept in `sessionStorage` for the tab). Wrong or missing: 401 with "This demo needs an invitation link."
- In production without `ACCESS_CODES` the route refuses everything (503); `ACCESS_CODES=off` turns the check off (for someone who runs the production build on their own machine); in development it is open.
- Limits, counted in memory per server instance (best effort on serverless): `RATE_LIMIT_PER_CODE_PER_HOUR` (default 30) and `RATE_LIMIT_TOTAL_PER_DAY` (default 400); over the limit: 429 with "Try again in about N minutes". With the $5 budget (about 1,000 requests over the judging days), set the daily total to about 200 on Netlify. The Meta-side limit is still the backstop.
- `MODEL_TIMEOUT_MS` (environment variable, for example 50000) shortens the model request timeout; unset, the default of 60 s stays (the evaluation harness is unaffected).
- Netlify's own `rateLimit` setting is not used yet: it may not apply inside a Next.js app, and the in-app limits already exist.

## 3. Work items
| # | Item | Who | Cost |
|---|---|---|---|
| 1 | Demo path: choose the cases to show (stable ones: Floraday box and gap, synthetic drawings, and general box notes once measured), run each scene several times and keep only what is reliable | Claude with the owner's approval of each live run | live requests, amount stated first |
| 2 | UI polish on the screens that appear in the video (CSS and light markup, no behaviour change); the owner reviews the visuals | Claude + owner | none |
| 3 | Repository for the public: license (owner chooses, MIT suggested), README (what it is, how to run with `MODEL_API_KEY`, Data handling, known limits, evaluation results), `CLAUDE.md` "Current state" brought up to date (it still lists editing and export as not implemented), review of `docs/` and the git history before it goes public, check that no private images or keys are tracked (checked once on 2026-10-29 by pattern search: nothing found; repeat before publishing) | Claude; making the repo public needs the owner's approval | none |
| 4 | Demo video script: scenes, what is on screen, what is said, 3 minutes; checklist for recording | Claude writes it; the owner records | none |
| 5 | Form answers: project description, use of Meta products (Muse Spark 1.3 through Meta Model API: vision, grounding, structured output), why Meta's models matter | Claude drafts; the owner reviews and submits | none |
| 7 | Netlify deployment (section 2): access code and call limit on the route, payload and timeout settings, notice text, deploy preview test, production deploy, test on the deployed site; optional beta testing afterwards | Claude implements and tests (live requests need approved amounts); the owner owns the Netlify account, the environment variables and the Meta-side limit | live requests for the tests, amount stated first |
| 6 | General box-note accuracy (areas A and B of `docs/test-plan.md`): convert the ContextMark cases, then one measured run | Claude; the live run needs approval | about $0.15 to $0.30 |

## 4. Schedule
| When | Work |
|---|---|
| Thursday 2026-10-29 | Done: ContextMark cases converted and measured (49 of 60 runs pass), PR #10 merged. Open: the owner's choices for item 7 |
| Friday 2026-10-30 | Morning: item 7 first (route protection, settings, deploy preview), then item 1 (demo path, live runs with approved amounts). Afternoon: production deploy and test, item 3 (repository preparation), README, freeze. Item 2 (UI polish) shrinks to the screens that appear in the video, and is cut first if time runs out. Optional beta: invitations go out Friday evening only if the deployment is stable. The owner reviews the visuals and the script |
| Saturday and Sunday | No work |
| Monday 2026-11-02 | The owner records the video; fixes only for bugs seen while recording; make the repository public after the owner's approval |
| Tuesday 2026-11-03 | Submit with margin (form, repository link, video link); no changes after that unless something is broken |
| Wednesday 2026-11-04 | Deadline 21:00 ET (20:00 Central). Nothing planned |

## 5. Done when
- The repository is public, has a license and a README that a stranger can follow (install, set `MODEL_API_KEY`, run, what the known limits are), and `npm test`, `tsc`, `lint` and `build` pass on `main`.
- The video (3 minutes) is recorded from a build whose scenes were run several times beforehand, and is uploaded where the form's link can reach it.
- Every required field of the form is answered; the owner has read the text and pressed submit.

## 6. Needed from the owner
Decided (2026-10-29): license MIT; track and problem statement; deployment on Netlify; beta testing optional; access by a code per tester plus a call limit; budget for judges and testers $5 (about 1,000 requests).
1. **Now (before the Friday work on item 7):**
   - whether the Meta Model API console has a spending limit or budget alert, and setting it;
   - creating or choosing the Netlify site and putting `MODEL_API_KEY` in its environment settings when the deploy preview works (Claude has no access to either);
2. **If beta testing is wanted:** the number of testers (5 to 10 suggested), where feedback goes (an external form), and Meta's data-retention terms read before outside users send screenshots.
3. **Friday morning:** confirm the UI polish direction (neutral clean look with one accent colour, system fonts, no new dependency).
4. **Before each live run:** approval of the number of requests and the amount.
5. **Friday and Monday:** review of the UI visuals, the video script and the form answers; recording the video (the owner); approval to make the repository public (after the pre-publication review).
Not asked, done as part of item 3: bringing `CLAUDE.md` "Current state" up to date. Optional: asking the organizers what "live product" means, and entering the Most Viral Track (needs an X post by the owner).

## 7. Risks
- **"Simple image analyzer" is on the list of projects to avoid.** Pyosi must not be presented as one. What it is: a workflow from rough notes to editable, exportable annotated screenshots; spatial grounding with measured accuracy; distance lines whose positions are snapped to the real pixels; editing and export; an evaluation harness with fixed cases and saved raw responses. The description and the video lead with that, with the measured limits stated (see below).
- **Existing-project rule (low risk, one sentence).** Pyosi is a separate solution built from 2026-10-27. Floraday is the owner's own web app and the screenshot was taken by the owner (confirmed 2026-10-29). The Floraday screenshot and its hand-measured boxes (and, if used, the ContextMark test cases) come from the owner's earlier problem-discovery repository ContextMark (first commit 2026-10-19). The README names that source in one sentence so the original contribution is not unclear.
- **Contributors.** Solo project: the contributor is the owner. Whether to mention that Claude Code helped write the code is the owner's choice; the FAQ does not require it.
- **The demo shows only the cases that work.** The README states the known limits (weak cases D2 and D7, one distance-line overshoot on light grey outlines) and the measured results (`docs/eval-log.md`), so a reviewer who runs the app is not surprised.
- **General box accuracy is not yet measured** (item 6). If it is poor, the demo and the description say what Pyosi does reliably (distance lines on plain backgrounds, boxes on clear elements) instead of claiming more.
- **Impact is scored; the target user is unvalidated** (engineers who share screenshots). The description says so instead of inventing numbers.
- **Public repository:** the history contains the author's name and email and the full development and evaluation logs. Reviewed in item 3 before publishing.
- **Video quality and length (3 minutes) is the owner's recording**, so it is scheduled on Monday with Tuesday as margin.
- **API key and cost:** with a public deployment every call spends the owner's key: the route is protected (section 2), the Meta-side limit is the backstop, and the budget for judges and testers is fixed beforehand.
- **Friday is crowded** (deployment, protection, demo path, repository, README): item 2 is cut first; the deployment itself is not optional any more, but beta testing is.
- **Not used, not claimed:** open-weight models (so no claim for that bonus) and other Muse or SAM models; mentioned only as possible future work.
