// The cases of the previous discovery project converted for Pyosi (docs/test-plan.md, section 4). That project is the owner's
// earlier problem-discovery project (first commit 2026-10-19, before the hackathon); its test setup
// has 12 cases on four screenshots of the owner's own Floraday web app, with boxes the owner
// measured from the pixels (ground truth "gt_v2", approved 2026-10-22).
//
// What was changed for Pyosi: the notes are English (the MVP is English only; the originals were
// Korean and are kept in `original`), and the expected answers use Pyosi's vocabulary:
//   target    a located element: a found box must overlap the truth box (IoU, see THRESHOLDS)
//   ambiguous the notes fit several elements: the answer must be "ambiguous", not a guessed box
//   ambiguousOr  as ambiguous, but a box on the one element the image points to is accepted too (CM4)
//   absent    the named element is not in the screenshot: it must be reported as not found
// Truth boxes are [x0, y0, x1, y1] in ORIGINAL image pixels (the previous project's single-annotator ground truth).
// CM_Case_1_2 is the same file as public/fixtures/floraday.png; the other three screenshots show the
// browser window (tab, address bar, profile picture, on one of them the macOS menu bar), so they stay
// in .eval-private/previous/ (git-ignored) and the cases are skipped when the files are missing.

const FLORADAY = { path: "public/fixtures/floraday.png" }; // previous project, CM_Case_1_2
const case3 = { path: ".eval-private/previous/CM_Case_3.png" };
const case4 = { path: ".eval-private/previous/CM_Case_4.png" };
const case5 = { path: ".eval-private/previous/CM_Case_5.png" };

const BUTTON = [883, 1023, 1169, 1095]; // Choose Another Sky button on CM_Case_1_2
const target = (box) => ({ type: "target", box });

export const CM_CASES = [
  {
    id: "CM1",
    title: "Floraday: one button looks small",
    image: FLORADAY,
    notes: "The Choose Another Sky button looks a bit smaller than in the design. Please check.",
    original: "Choose Another Sky 버튼이 디자인보다 좀 작아보이는거 같아요. 확인해주세요.",
    expect: [target(BUTTON)],
  },
  {
    id: "CM2",
    title: "Floraday: two elements in one note",
    image: FLORADAY,
    notes:
      "The flower image tile looks too large. Please check. Also the Choose Another Sky button is hard to notice. Please check that too.",
    original: "꽃 이미지 화면타일 사이즈가 너무 큰 거 같아요. 한 번 확인해주세요. 그리고 Choose Another Sky 버튼이 눈에 너무 안띄는 거 같아요. 이것도 확인해주세요.",
    expect: [target([550, 198, 1502, 978]), target(BUTTON)],
  },
  {
    id: "CM3",
    title: "Floraday: a refresh button that does not exist",
    image: case3,
    notes: "I can't see a button to refresh the flower and message tile. Please check and fix.",
    original: "꽃이랑 메시지 타일을 새로고침할 수 있는 버튼이 안보이네요. 확인 후 반영해주세요.",
    expect: [{ type: "absent" }],
  },
  {
    id: "CM3b",
    title: "Floraday: the missing button, with its expected position",
    image: case3,
    notes:
      "The button to refresh the flower and message tile should be at the top right of the tile, but I can't see it. Please check and fix.",
    original: "꽃이랑 메시지 타일을 새로고침할 수 있는 버튼이 타일 우측상단에 있어야 하는데 안보이네요. 확인 후 반영해주세요.",
    expect: [{ type: "absent" }],
  },
  {
    id: "CM4",
    title: "Floraday weather cards: hover effect (boundary case)",
    image: case4,
    notes: "The hover effect isn't noticeable. Please check.",
    original: "Hover 효과가 두드러지지 않네요. 확인해주세요.",
    // The previous project marked this as the boundary case: one card (Rainy) is in the hover state, the notes do not
    // name it. Owner's rule (2026-10-29): when the image points to a single element, "ambiguous" and a box
    // on that element are both fine; a box anywhere else is a guess.
    expect: [{ type: "ambiguousOr", box: [1035, 765, 1285, 952] }],
  },
  {
    id: "CM5",
    title: "Floraday weather cards: one icon is small",
    image: case5,
    notes: "The icon on the Rainy weather button looks smaller than on the other buttons. Please check.",
    original: "비 오는 날씨 버튼의 아이콘 크기가 다른 버튼보다 작은 것 같아요. 확인해주세요.",
    expect: [target([1128, 849, 1194, 913])],
  },
  {
    id: "CM6",
    title: "Floraday weather cards: the hovered card",
    image: case4,
    notes: "The effect on the card in the hover state isn't noticeable.",
    original: "hover 상태인 카드의 효과가 두드러지지 않네요.",
    expect: [target([1035, 765, 1285, 952])],
  },
  {
    id: "CM7",
    title: "Floraday weather cards: a card named in the note",
    image: case4,
    notes: "The hover effect on the Sunny card isn't noticeable.",
    original: "Sunny 카드의 hover 효과가 두드러지지 않네요.",
    expect: [target([489, 765, 739, 952])],
  },
  {
    id: "CM8",
    title: "Floraday weather cards: hover note, no hover visible",
    image: case5,
    notes: "The hover effect isn't noticeable.",
    original: "Hover 효과가 두드러지지 않네요.",
    expect: [{ type: "ambiguous" }],
  },
  {
    id: "CM9",
    title: "Floraday weather cards: all four icons",
    image: case5,
    notes: "The card icons look a bit small.",
    original: "카드 아이콘 크기가 좀 작은 것 같아요.",
    // gt_v2 (owner's decision 2026-10-22): "card icons" means all four icons.
    expect: [target([581, 846, 647, 913]), target([854, 854, 920, 904]), target([1128, 849, 1194, 913]), target([1400, 849, 1466, 910])],
  },
  {
    id: "CM10",
    title: "Floraday: only one button, must not be called ambiguous",
    image: FLORADAY,
    notes: "The button looks a bit small.",
    original: "버튼이 좀 작아 보여요.",
    expect: [target(BUTTON)],
  },
  {
    id: "CM11",
    title: "Floraday weather cards: a delete button that does not exist",
    image: case4,
    notes: "I can't see the delete button at the top right of the Rainy card.",
    original: "Rainy 카드 우측 상단의 삭제 버튼이 안 보이네요.",
    expect: [{ type: "absent" }],
  },
];
