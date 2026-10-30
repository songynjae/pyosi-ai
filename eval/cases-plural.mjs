// Plural references: "all the delivery dates", "every unit price" (the user-interview review of 2026-10-30).
// Pointing at several similar things at once is where drawing the marks by hand costs the most, and where the
// earlier measurements were weakest (ContextMark CM9, "the card icons": mostly "ambiguous" or one merged box;
// the 8-item list D7). The notes do not say how many there are. Same mock screens and truth boxes as the
// text-heavy set (eval/fixtures/text/). Scoring: `target` per item (IoU 0.5; each box is used once), so a case
// passes only when every item is marked. Run with `npm run eval -- --set plural`.
import { TEXT_TRUTH as T } from "./fixtures/text/truth.mjs";

const target = (box) => ({ type: "target", box });
const img = (name) => ({ path: `eval/fixtures/text/${name}.png` });

export const PLURAL_CASES = [
  {
    id: "P1",
    title: "Purchase order: all three delivery dates",
    image: img("t1-order"),
    notes: "Highlight all the delivery dates.",
    expect: [target(T.t1_date_r1), target(T.t1_date), target(T.t1_date_r3)],
  },
  {
    id: "P2",
    title: "Purchase order: every unit price",
    image: img("t1-order"),
    notes: "Highlight every unit price.",
    expect: [target(T.t1_price_r1), target(T.t1_price), target(T.t1_price_r3)],
  },
  {
    id: "P3",
    title: "Invoice: all the line amounts",
    image: img("t4-invoice"),
    notes: "Highlight all the line amounts.",
    expect: [target(T.t4_amt1), target(T.t4_amt2), target(T.t4_amt3)],
  },
  {
    id: "P4",
    title: "Chat: all of Anna's messages",
    image: img("t3-chat"),
    notes: "Highlight all of Anna's messages.",
    expect: [target(T.t3_a1), target(T.t3_msg), target(T.t3_a5)],
  },
];
