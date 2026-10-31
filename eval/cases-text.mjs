// Text-heavy screens (docs/test-plan.md, area C and the user-interview review of 2026-10-30): small areas of
// text such as a date, a price or a quantity in a purchase order, an email, a chat and an invoice. The screens
// are mock-ups with fake data (eval/fixtures/text/*.html, rendered to PNG by scripts/make-text-fixtures.mjs),
// because the interviewees' real work screens cannot leave their companies. Truth boxes [x0, y0, x1, y1] are
// the pixel boxes of the text itself, read from the page (eval/fixtures/text/truth.mjs). Scoring: `target`
// (IoU, see eval/score.mjs); run with `npm run eval -- --set text`.
import { TEXT_TRUTH as T } from "./fixtures/text/truth.mjs";

const target = (box) => ({ type: "target", box });
const img = (name) => ({ path: `eval/fixtures/text/${name}.png` });

export const TEXT_CASES = [
  {
    id: "T1",
    title: "Purchase order: the delivery date and the unit price of one line",
    image: img("t1-order"),
    notes: "Highlight the delivery date and the unit price of the second line item.",
    expect: [target(T.t1_price), target(T.t1_date)],
  },
  {
    id: "T2",
    title: "Email: the quantity and the date of an earlier agreement (inline phrases)",
    image: img("t2-email"),
    notes: "Mark the quantity and the date of the earlier agreement.",
    expect: [target(T.t2_date), target(T.t2_qty)],
  },
  {
    id: "T3",
    title: "Chat: the message that confirms price and delivery",
    image: img("t3-chat"),
    notes: "Highlight the message that confirms the price and the delivery date.",
    expect: [target(T.t3_msg)],
  },
  {
    id: "T4",
    title: "Invoice: the total amount due",
    image: img("t4-invoice"),
    notes: "Highlight the total amount due.",
    expect: [target(T.t4_total)],
  },
  {
    id: "T5",
    title: "Purchase order: the total quantity is missing (the total row has an amount but no quantity)",
    image: img("t1-order"),
    notes: "The total quantity is missing.",
    expect: [{ type: "absent" }],
  },
  {
    id: "T6",
    title: "A GUI with six similar cards: one button and one badge named in a message",
    image: img("t5-projects"),
    notes: "Hi Austin, on the Projects page the Share button on the Delta card should be disabled because the project is archived. And the Harbor card says Draft, but it went live last week. Could you fix both?",
    expect: [target(T.t5_share_delta), target(T.t5_badge_harbor)],
  },
  {
    id: "T7",
    title: "Chat: one message to mark and one the note mentions but the chat does not contain",
    image: img("t3-chat"),
    notes: "Please look at the message where she confirms the price, and the one where she promises the discount.",
    expect: [target(T.t3_msg), { type: "absent" }],
  },
];
