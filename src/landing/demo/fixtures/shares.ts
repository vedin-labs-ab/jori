import { type ShareRow } from "@/shared/console/materials/history"
import { day } from "./clock"
import { demoId } from "./ids"
import { renewalsTableId } from "./materials/tables"

/** The share links minted so far, by material: one live link on the
 *  renewals table with three days left, and one that has run out. */
export function demoShares(now: number): Record<string, ShareRow[]> {
  return {
    [renewalsTableId]: [
      {
        shareId: demoId("shares", "renewals-live"),
        createdAt: now - 2 * day,
        expiresAt: now + 3 * day,
      },
      {
        shareId: demoId("shares", "renewals-past"),
        createdAt: now - 12 * day,
        expiresAt: now - 5 * day,
      },
    ],
  }
}
