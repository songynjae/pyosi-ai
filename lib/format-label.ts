/**
 * Upper-cases the first letter of a label for display ("gap left of icon" ->
 * "Gap left of icon"). Words like "iPhone" or "eBay" (lower case followed by an
 * upper-case letter) are left alone. The stored label is not changed.
 */
export function capitalizeFirst(label: string): string {
  const first = label.charAt(0);
  const second = label.charAt(1);
  if (first === "") return label;
  const upper = first.toLocaleUpperCase();
  if (upper === first) return label;
  if (second !== "" && second !== second.toLocaleLowerCase()) return label;
  return upper + label.slice(1);
}
