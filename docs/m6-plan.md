# M6 plan: prepare and submit (DRAFT for approval)

Written 2026-10-29 after reading the hackathon's submission form (Meta Global AI Developer Hackathon, Cerebral Valley). Deadline: **2026-11-04 21:00 ET**. Feature freeze: Friday 2026-10-30; no work over the weekend; Monday and Tuesday are buffer with no new features.

## 1. What the submission form asks for
Required: team name and members, track, problem statement, project description, **public GitHub repository**, **3-minute demo video**, how Meta products were used, why Meta's models matter to the solution, and two opinion questions about Meta Model API. Optional: an X post link (Most Viral Track) and feedback on partner technologies (Fireworks, Modal, Baseten). **There is no deployed-URL field.**
Public event page: the indie developer track is judged on creativity, technical ambition and whether it works; the startup track on technical execution and holding up in production. Proposed track: indie developer. Themes: "Build for Your World" fits best.
Not yet known: the options of the track and problem-statement fields (the owner will paste them), and the official rules (published around 2026-10-26; the owner has access).

## 2. Decision: no public deployment
A deployment is not required, so the API-route access control and rate limit (`POST /api/annotate` has none) are not needed for the submission, and nothing publicly callable spends the owner's API key. Reviewers who want to run the app use their own key (README). If a deployment is added later, those protections come first.

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
1. License (MIT suggested) and when to make the repository public (proposed: Monday, after the pre-publication review).
2. The form's track and problem-statement options (paste them), and anything in the official rules about the submission (video host, length, repository requirements).
3. Approval of each live run with its amount (the demo-path runs and the general-box measurement).
4. Review of the UI polish (visuals) and of the video script; recording the video.
5. Whether `CLAUDE.md` "Current state" may be brought up to date as part of item 3.

## 7. Risks
- **The demo shows only the cases that work.** The README states the known limits (weak cases D2 and D7, one distance-line overshoot on light grey outlines) and the measured results (`docs/eval-log.md`), so a reviewer who runs the app is not surprised.
- **General box accuracy is not yet measured** (item 6). If it is poor, the demo and the description say what Pyosi does reliably (distance lines on plain backgrounds, boxes on clear elements) instead of claiming more.
- **Public repository:** the history contains the author's name and email and the full development and evaluation logs. Reviewed in item 3 before publishing.
- **Video quality and length (3 minutes) is the owner's recording**, so it is scheduled on Monday with Tuesday as margin.
- **API key and cost:** live runs cost money; the submission itself needs none.
