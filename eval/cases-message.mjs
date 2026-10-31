// Message-style notes (the owner's idea of 2026-10-30: people often write the message they would send with
// a screenshot and want to know which parts of the screenshot it is about). The notes here are full messages,
// with a greeting, several sentences and mentions of things that are not on the screen, instead of the short
// rough notes of the other sets. Images and truth boxes are the ones of the Floraday screenshot of the previous project
// and of the text-heavy mock screens (eval/fixtures/text/). Scoring: `target` (IoU), `absent` (not found).
// Run with `npm run eval -- --set message`. Entries beyond the expected ones are visible in the entries
// column and in the raw answers: a mark for something the message only mentions in passing is an error
// that the scoring does not count by itself.
import { TEXT_TRUTH as T } from "./fixtures/text/truth.mjs";

const target = (box) => ({ type: "target", box });
const FLORADAY = { path: "public/fixtures/floraday.png" };
const text = (name) => ({ path: `eval/fixtures/text/${name}.png` });

export const MESSAGE_CASES = [
  {
    id: "M1",
    title: "Floraday: a polite message about two elements",
    image: FLORADAY,
    notes:
      "Hi Anna, thanks for the update. The lily card looks too big on the page, and the Choose Another Sky button is hard to see. Could you check both before Monday?",
    expect: [target([550, 198, 1502, 978]), target([883, 1023, 1169, 1095])],
  },
  {
    id: "M2",
    title: "Floraday: one element among remarks about things that are not marks",
    image: FLORADAY,
    notes:
      "Hi, I tried the page yesterday. The Choose Another Sky button looked a bit small to me. Everything else was fine, and the sign-in worked well.",
    expect: [target([883, 1023, 1169, 1095])],
  },
  {
    id: "M3",
    title: "Purchase order: a message about the delivery date and the price of one line",
    image: text("t1-order"),
    notes:
      "Hi Min-jun, I looked at the purchase order. The delivery date on the second line looks wrong to me, and the unit price there seems higher than we agreed. Could you confirm both today? Thanks, Anna",
    expect: [target(T.t1_price), target(T.t1_date)],
  },
  {
    id: "M4",
    title: "Email: a message about the quantity and the date it mentions",
    image: text("t2-email"),
    notes:
      "Hey, can you check this email? I think the quantity he mentions is different from what we ordered, and I am not sure about the date either.",
    expect: [target(T.t2_date), target(T.t2_qty)],
  },
  {
    id: "M5",
    title: "Chat: one message to mark and a promise that is not in the chat",
    image: text("t3-chat"),
    notes: "Please look at the message where she confirms the price. Also, I could not find the discount she promised.",
    expect: [target(T.t3_msg), { type: "absent" }],
  },
];
