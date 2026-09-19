// What a pointer can land on in a list, as selectors the row and the
// marquee both read.

/** A selectable row, carrying its id for the marquee. */
export const rowSelector = "tr[data-row-id]"

/** The name link a row opens, and drags, by. */
export const rowLinkSelector = "[data-row-link] a"

/** Controls that answer a pointer themselves. A marquee starts on none of
 *  them, and a click on one never picks the row. */
export const interactiveSelector = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  '[role="button"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="textbox"]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(",")
