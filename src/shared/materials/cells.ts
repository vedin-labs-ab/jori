/** Compact text a grid cell displays; shared by the console grid and the
 *  read-only share view so a table reads the same on both. */
export function displayCellText(value: unknown) {
  return value === undefined ? "" : String(value)
}
