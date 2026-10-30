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

## 2. Public deployment: open question
The form has no deployed-URL field, so the first plan (2026-10-29) dropped the deployment. The FAQ sentence "Judges assess your video, code and live product" leaves it open whether judges expect something they can click. Two options:
- **A. No deployment (current plan).** Video, public repository and a README that lets a reviewer run the app with their own `MODEL_API_KEY`. No access control or rate limit is needed because nothing public can spend the owner's key.
- **B. A limited public deployment**, linked in the project description. Before it goes up, `POST /api/annotate` needs access control or a strict rate limit and a spending cap on the key (it has none today). This is protection work, not a feature, but it needs hosting setup and testing in the Friday window.
To decide: ask the organizers (the FAQ says to check with @CV when unsure) what "live product" means. Until then A is the plan; B would be scheduled for Friday afternoon only if the answer says a clickable product is expected.

## 3. Work items
| # | Item | Who | Cost |
|---|---|---|---|
| 1 | Demo path: choose the cases to show (stable ones: Floraday box and gap, synthetic drawings, and general box notes once measured), run each scene several times and keep only what is reliable | Claude with the owner's approval of each live run | live requests, amount stated first |
| 2 | UI polish on the screens that appear in the video (CSS and light markup, no behaviour change); the owner reviews the visuals | Claude + owner | none |
| 3 | Repository for the public: license (owner chooses, MIT suggested), README (what it is, how to run with `MODEL_API_KEY`, Data handling, known limits, evaluation results), `CLAUDE.md` "Current state" brought up to date (it still lists editing and export as not implemented), review of `docs/` and the git history before it goes public, check that no private images or keys are tracked (checked once on 2026-10-29 by pattern search: nothing found; repeat before publishing) | Claude; making the repo public needs the owner's approval | none |
| 4 | Demo video script: scenes, what is on screen, what is said, 3 minutes; checklist for recording | Claude writes it; the owner records | none |
| 5 | Form answers: project description, use of Meta products (Muse Spark 1.3 through Meta Model API: vision, grounding, structured output), why Meta's models matter | Claude drafts; the owner reviews and submits | none |
| 6 | General box-note accuracy (areas A and B of `docs/test-plan.md`): convert the ContextMark cases, then one measured run | Claude; the live run needs approval | about $0.15 to $0.30 |

## 4. Schedule
| When | Work |
|---|---|
| Thursday 2026-10-29 (rest of day) | Item 6 preparation (free): convert ContextMark cases, privacy check of its images; draft the form answers and the video script |
| Friday 2026-10-30 | Morning: item 1 (demo path, live runs with approved amounts) and item 2 (UI polish on demo screens). Afternoon: item 3 (repository preparation), README, freeze. The owner reviews the visuals and the script |
| Saturday and Sunday | No work |
| Monday 2026-11-02 | The owner records the video; fixes only for bugs seen while recording; make the repository public after the owner's approval |
| Tuesday 2026-11-03 | Submit with margin (form, repository link, video link); no changes after that unless something is broken |
| Wednesday 2026-11-04 | Deadline 21:00 ET (20:00 Central). Nothing planned |

## 5. Done when
- The repository is public, has a license and a README that a stranger can follow (install, set `MODEL_API_KEY`, run, what the known limits are), and `npm test`, `tsc`, `lint` and `build` pass on `main`.
- The video (3 minutes) is recorded from a build whose scenes were run several times beforehand, and is uploaded where the form's link can reach it.
- Every required field of the form is answered; the owner has read the text and pressed submit.

## 6. Needed from the owner
Decided: license MIT (2026-10-29); track and problem statement (above). Everything else below is asked when it is due.
1. **Now:** whether to ask the organizers what "live product" means (section 2), and whether to enter the Most Viral Track (needs an X post of the demo, posted by the owner).
2. **Friday morning:** confirm the UI polish direction (neutral clean look with one accent colour, system fonts, no new dependency) before the CSS pass.
3. **Before each live run:** approval of the number of requests and the amount.
4. **Friday and Monday:** review of the UI visuals, the video script and the form answers; recording the video (the owner); approval to make the repository public (after the pre-publication review).
Not asked, done as part of item 3: bringing `CLAUDE.md` "Current state" up to date.

## 7. Risks
- **"Simple image analyzer" is on the list of projects to avoid.** Pyosi must not be presented as one. What it is: a workflow from rough notes to editable, exportable annotated screenshots; spatial grounding with measured accuracy; distance lines whose positions are snapped to the real pixels; editing and export; an evaluation harness with fixed cases and saved raw responses. The description and the video lead with that, with the measured limits stated (see below).
- **Existing-project rule (low risk, one sentence).** Pyosi is a separate solution built from 2026-10-27. Floraday is the owner's own web app and the screenshot was taken by the owner (confirmed 2026-10-29). The Floraday screenshot and its hand-measured boxes (and, if used, the ContextMark test cases) come from the owner's earlier problem-discovery repository ContextMark (first commit 2026-10-19). The README names that source in one sentence so the original contribution is not unclear.
- **Contributors.** Solo project: the contributor is the owner. Whether to mention that Claude Code helped write the code is the owner's choice; the FAQ does not require it.
- **The demo shows only the cases that work.** The README states the known limits (weak cases D2 and D7, one distance-line overshoot on light grey outlines) and the measured results (`docs/eval-log.md`), so a reviewer who runs the app is not surprised.
- **General box accuracy is not yet measured** (item 6). If it is poor, the demo and the description say what Pyosi does reliably (distance lines on plain backgrounds, boxes on clear elements) instead of claiming more.
- **Impact is scored; the target user is unvalidated** (engineers who share screenshots). The description says so instead of inventing numbers.
- **Public repository:** the history contains the author's name and email and the full development and evaluation logs. Reviewed in item 3 before publishing.
- **Video quality and length (3 minutes) is the owner's recording**, so it is scheduled on Monday with Tuesday as margin.
- **API key and cost:** live runs cost money; the submission itself needs none under option A.
- **Not used, not claimed:** open-weight models (so no claim for that bonus) and other Muse or SAM models; mentioned only as possible future work.
