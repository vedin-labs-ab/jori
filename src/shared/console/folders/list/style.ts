import { nameCellWidth } from "../../materials/cells/name"

/** Name-cell link class for folder listings. The width cap sits on the link
 *  itself, not the table cell — browsers ignore max-width on table cells
 *  when sizing auto-layout columns — so a long name truncates inside the
 *  capped link instead of widening the column. The link keeps to its
 *  name, so the rest of the cell is free to start a marquee. */
export const nameLinkClassName = `flex w-fit items-center gap-2 font-medium ${nameCellWidth}`
