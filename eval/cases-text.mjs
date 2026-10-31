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
  // T8 to T11: added 2026-10-31, written down before any run of them (cases, notes and expectations are not changed
  // after seeing the answers). They add the "ambiguous" and "not found" answers on screens made in this period;
  // They were first numbered T8, T9, T11 and T13 in the plan; they are renumbered T8 to T11. T11 first named "shipping", but the invoice has a "Freight, Busan"
  // line, so the note names a purchase order number, which the invoice does not contain.
  {
    id: "T8",
    title: "A GUI with six similar cards: the one Archived badge",
    image: img("t5-projects"),
    notes: "The Archived badge is hard to notice.",
    expect: [target(T.t5_badge_delta)],
  },
  {
    id: "T9",
    title: "A GUI with six similar cards: a Share button that could be any of six",
    image: img("t5-projects"),
    notes: "The Share button does not work.",
    expect: [{ type: "ambiguous" }],
  },
  {
    id: "T10",
    title: "Email: an attachment the email does not have",
    image: img("t2-email"),
    notes: "Please open the attachment that Min-jun sent and check it.",
    expect: [{ type: "absent" }],
  },
  {
    id: "T11",
    title: "Invoice: a purchase order number the invoice does not have",
    image: img("t4-invoice"),
    notes: "Please check the purchase order number on this invoice.",
    expect: [{ type: "absent" }],
  },
  // T12 to T19: a phone screenshot (390x844) of a made-up weight-tracking app (eval/fixtures/text/t6-weight.html, fake
  // data), added 2026-10-31. Cases, notes and expectations were written before any run of them and are not changed
  // after seeing the answers. They add a chart, icons without labels, a tall image and a gap on a phone screen; tall
  // images had never been tested (lib/pad-aspect.ts). The goal line is marked together with its label because the line
  // alone is 2 px high. The gap is measured from the bottom of the Add weight button to the top of the tab bar.
  {
    id: "T12",
    title: "Weight app (phone): the settings icon in the tab bar, icons without labels",
    image: img("t6-weight"),
    notes: "The settings icon is hard to find.",
    expect: [target(T.t6_settings)],
  },
  {
    id: "T13",
    title: "Weight app (phone): the dashed goal line with its label",
    image: img("t6-weight"),
    notes: "The goal line and its label are too faint.",
    expect: [target(T.t6_goal)],
  },
  {
    id: "T14",
    title: "Weight app (phone): the tooltip on the chart",
    image: img("t6-weight"),
    notes: "The weight shown in the chart tooltip looks like a typo.",
    expect: [target(T.t6_tooltip)],
  },
  {
    id: "T15",
    title: "Weight app (phone): the big number and the latest entry",
    image: img("t6-weight"),
    notes: "The big number does not match the latest entry.",
    expect: [target(T.t6_big), target(T.t6_last_entry)],
  },
  {
    id: "T16",
    title: "Weight app (phone): the gap between the Add weight button and the tab bar",
    image: img("t6-weight"),
    notes: "The gap between the Add weight button and the tab bar is too big.",
    expect: [{ type: "gap", axis: "vertical", box: [16, 626, 374, 780] }],
  },
  {
    id: "T17",
    title: "Weight app (phone): an edit icon that appears three times",
    image: img("t6-weight"),
    notes: "The edit icon is too small.",
    expect: [{ type: "ambiguous" }],
  },
  {
    id: "T18",
    title: "Weight app (phone): a calorie summary the screen does not have",
    image: img("t6-weight"),
    notes: "Please check the calorie summary.",
    expect: [{ type: "absent" }],
  },
  {
    id: "T19",
    title: "Weight app (phone): a message about the selected tab and the Add weight button",
    image: img("t6-weight"),
    notes: "Hi Mia, on the weight screen the selected tab should be 1W, not 1M. And the Add weight button should be bigger. Could you fix both?",
    expect: [target(T.t6_tab_1m), target(T.t6_add)],
  },
  // T20 to T27: a second phone screenshot (390x844), a made-up sleep app (eval/fixtures/text/t7-sleep.html, fake data),
  // added 2026-10-31 as a held-out check of the tall-image experiment on T12 to T19 (docs/eval-log.md): the same kinds
  // of notes on a screen that was not used to choose how a tall image is sent. Cases, notes and expectations were
  // written before any run of them and are not changed after seeing the answers. The gap is measured from the bottom
  // of the Log sleep button to the top of the tab bar.
  {
    id: "T20",
    title: "Sleep app (phone): the profile icon in the tab bar, icons without labels",
    image: img("t7-sleep"),
    notes: "The profile icon is hard to find.",
    expect: [target(T.t7_profile)],
  },
  {
    id: "T21",
    title: "Sleep app (phone): the dashed goal line with its label",
    image: img("t7-sleep"),
    notes: "The goal line and its label are too faint.",
    expect: [target(T.t7_goal)],
  },
  {
    id: "T22",
    title: "Sleep app (phone): the tooltip on the chart",
    image: img("t7-sleep"),
    notes: "The time shown in the chart tooltip looks like a typo.",
    expect: [target(T.t7_tooltip)],
  },
  {
    id: "T23",
    title: "Sleep app (phone): the big number and the Deep sleep card",
    image: img("t7-sleep"),
    notes: "Please check the big number and the Deep sleep card.",
    expect: [target(T.t7_big), target(T.t7_deep)],
  },
  {
    id: "T24",
    title: "Sleep app (phone): the gap between the Log sleep button and the tab bar",
    image: img("t7-sleep"),
    notes: "The gap between the Log sleep button and the tab bar is too big.",
    expect: [{ type: "gap", axis: "vertical", box: [16, 680, 374, 780] }],
  },
  {
    id: "T25",
    title: "Sleep app (phone): an arrow icon that appears three times",
    image: img("t7-sleep"),
    notes: "The arrow icon is too small.",
    expect: [{ type: "ambiguous" }],
  },
  {
    id: "T26",
    title: "Sleep app (phone): a heart rate graph the screen does not have",
    image: img("t7-sleep"),
    notes: "Please check the heart rate graph.",
    expect: [{ type: "absent" }],
  },
  {
    id: "T27",
    title: "Sleep app (phone): a message about the selected tab and the Log sleep button",
    image: img("t7-sleep"),
    notes: "Hi Sam, on the sleep screen the selected tab should be Month, not Week. And the Log sleep button should be bigger. Could you fix both?",
    expect: [target(T.t7_week), target(T.t7_add)],
  },
];
