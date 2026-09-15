import { type Hit } from "../../contracts/discovery"
import { lexicalBoost } from "./provider/spelling"

export function rank(hits: Hit[], text: string) {
  const seen = new Set<string>()
  return hits
    .sort(
      (a, b) =>
        b.candidate.score +
        lexicalBoost(text, b.title, b.snippet) -
        (a.candidate.score + lexicalBoost(text, a.title, a.snippet))
    )
    .filter((hit) => {
      const record = hit.location.kind === "row" ? `:${hit.location.id}` : ""
      const key = `${hit.kind}:${hit.resourceId}${record}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
    .slice(0, 20)
    .map((hit) => hit.candidate)
}
