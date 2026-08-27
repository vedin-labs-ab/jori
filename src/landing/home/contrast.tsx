import { Section } from "../section"

/** The problem statement, and the enemy is private AI rather than manual
 *  status-chasing. It indicts the situation, not the visitor's own habit,
 *  and it sits right after the hero so "in the open" takes its meaning from
 *  the contrast instead of reading as an open-source claim. */
export function Contrast() {
  return (
    <Section
      className="border-y bg-muted/50"
      lede="Private threads vanish when the tab closes, and the answers never meet. Jori is one teammate with one memory, and its work is on the record."
      support
      title="Most AI works in private. Jori works in the open."
    />
  )
}
