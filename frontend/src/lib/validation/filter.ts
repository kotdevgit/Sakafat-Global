/**
 * Character filtering for inputs that accept only part of the keyboard, so a
 * digit typed into a name — or a letter typed into a phone number — never
 * appears at all. Filtering only ever removes characters; the value is still
 * validated afterwards, because "nothing left to strip" is not the same as valid.
 */

type Editable = HTMLInputElement | HTMLTextAreaElement;

/**
 * Rewrites the element's value through `clean`, keeping the caret where the
 * visitor left it. Without this, editing the middle of a value would throw the
 * caret to the end on every keystroke.
 */
export function filterInput(element: Editable, clean: (value: string) => string): string {
  const { value } = element;
  const cleaned = clean(value);
  if (cleaned === value) return value;
  const caret = element.selectionStart ?? value.length;
  // Cleaning the text before the caret gives the caret's new position directly.
  const nextCaret = clean(value.slice(0, caret)).length;
  element.value = cleaned;
  try {
    element.setSelectionRange(nextCaret, nextCaret);
  } catch {
    /* Inputs such as type="email" do not support selection ranges. */
  }
  return cleaned;
}

/** Drops every character the pattern does not match. */
export function keepOnly(pattern: RegExp) {
  return (value: string) => Array.from(value).filter((char) => pattern.test(char)).join("");
}
