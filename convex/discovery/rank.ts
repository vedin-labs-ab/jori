import { type Hit } from "../../contracts/discovery"
import { lexicalBoost } from "./provider/spelling"

export function rank(hits: Hit[], text: string) {
  const counts = new Map<string, number>()
  return hits
    .sort(
      (a, b) =>
        b.candidate.score +
        lexicalBoost(text, b.title, b.snippet) -
        (a.candidate.score + lexicalBoost(text, a.title, a.snippet))
    )
    .filter((hit) => {
      const count = counts.get(hit.resourceId) ?? 0
      counts.set(hit.resourceId, count + 1)
      return count < 2
    })
    .slice(0, 20)
    .map((hit) => hit.candidate)
}
