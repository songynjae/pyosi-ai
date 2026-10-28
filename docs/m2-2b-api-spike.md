# M2.2-B: Meta Model API connectivity and grounding spike

**Status: two single requests run on 2026-10-27 (found case and not_found case); both passed.** Isolated from the app. Nothing in `app/`, `components/` or `lib/` uses it. The script is `spikes/m2-2b/run.mjs`.

## Confirmed from Meta's docs (dev.meta.ai, checked 2026-10-27)
- Endpoint: `POST https://api.meta.ai/v1/chat/completions` (Responses and Messages also exist).
- Auth: `Authorization: Bearer $MODEL_API_KEY`. Keys start with `LLM_`.
- Model: `muse-spark-1.3` (standard mode, not used for training). `muse-spark-1.3-contributor` is cheaper but Meta trains on prompts and files, so it is not used.
- Image input: `{"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}` in a user message. PNG ok, 50 MB and 50 images per request.
- Structured output: `response_format: {type: "json_schema", json_schema: {name, schema, strict}}`; `strict` defaults to false.
- Parameters used: `reasoning_effort: "minimal"`, `max_completion_tokens: 2000`.
- Documented coordinate convention for image prompts: 0-1000 grid, top-left origin, relative to the image the model received; values may slightly exceed the range. The shape of the output is defined by the prompt.
- Pricing: $1.25 / $4.25 per million input / output tokens. Reasoning tokens bill as output.
- Not documented: that Muse Spark does UI-element grounding at all. This spike tests it.

## Test case
- Image: `public/fixtures/floraday.png` (2048x1124).
- Instruction: "Locate the secondary button below the flower card that lets the user pick a different sky."
- Ground truth: "Choose Another Sky" button, pixels `[883, 1023, 1169, 1095]` = about `[431, 910, 571, 974]` on the 0-1000 grid.
- Output schema: `status` (`found | ambiguous | not_found`), `label`, `box_2d` (`[x_min, y_min, x_max, y_max]` or `null`), `confidence`, `reason`.
- Pass: IoU >= 0.5 rough, >= 0.7 good; status and box consistent; box converts to percent and passes `parseAnnotations()`.

## Running
```bash
node spikes/m2-2b/run.mjs          # dry run, sends nothing, does not read the key
node spikes/m2-2b/run.mjs --send   # ONE request (case "button"), no retries, 120 s timeout
node spikes/m2-2b/run.mjs --case refresh --send   # ONE request, not_found case
```
Raw responses are saved to `spikes/m2-2b/results/` (git-ignored; contains no key or image data).

## Results
One request, no retries. Raw response: `spikes/m2-2b/results/run-2026-10-28T01-38-27-361Z.json` (git-ignored).

| Item | Value |
|---|---|
| HTTP status | 200, `finish_reason: stop`, `refusal: null` |
| Latency | 1,770 ms (single sample, wall clock) |
| Tokens | prompt 3,113 (image + prompt, 0 cached), completion 192, of which reasoning 141; total 3,305 |
| Estimated cost | about $0.0047 (standard rates) |
| Rate-limit headers | `x-ratelimit-limit-requests` 3000, `-limit-tokens` 4,000,000, plus `-remaining-*`; `x-request-id` present |
| Response | `{"box_2d":[431,907,571,973],"confidence":0.99,"label":"Choose Another Sky","reason":"...","status":"found"}` |
| Coordinate convention observed | 0-1000 grid, top-left origin, `[x_min, y_min, x_max, y_max]`, as prompted. Within range. |
| IoU vs ground truth | 0.933 (truth about `[431, 910, 571, 974]`; off by about 3 grid units on the top edge, about 1 on the bottom) |
| Output valid against schema | Yes. Valid JSON with all required fields; `anyOf` nullable schema accepted with `strict: false`. |

Notes:
- Model returned keys in alphabetical order, not schema order.
- Single sample: says nothing about variance, `ambiguous`/`not_found` behaviour or other screenshots.
- Output tokens were mostly reasoning (141 of 192) even at `minimal`.

### Second request: `not_found` case (Refresh button)
Instruction: "Locate the Refresh button on the flower card." (no such control in the screenshot). Raw: `spikes/m2-2b/results/refresh-2026-10-28T01-46-38-763Z.json`.

| Item | Value |
|---|---|
| HTTP status / latency | 200 / 2,132 ms |
| Tokens | prompt 3,105, completion 201 (reasoning 144); cost about $0.0047 |
| Response | `{"box_2d": null, "confidence": 0.95, "label": "Refresh button on the flower card", "reason": "No refresh button is visible on the flower card.", "status": "not_found"}` |
| Result | Correct: `not_found` with `box_2d: null`, no invented location. Matches Pyosi's rule that `not_found` has a null box. |

Notes: `confidence` on `not_found` (0.95) is confidence in the absence, not a location score. Still two samples in total, one per case; no `ambiguous` test yet.

## Open questions
- Does `strict: true` accept the nullable `box_2d` (`anyOf` below the root)? (`strict: false` works.)
- Does reasoning change box quality?
- `ambiguous` behaviour is untested, and a larger sample is needed to judge variance.
- Is `sam-3.1` worth a later spike if Spark's boxes are loose?
