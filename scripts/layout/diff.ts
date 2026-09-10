import { type Box, type Snapshot } from "./types.ts"

function changed(from: Box, to: Box) {
  return (Object.keys(from) as (keyof Box)[]).some(
    (key) => Math.abs(from[key] - to[key]) > 0.5
  )
}

export function compare(before: Snapshot, after: Snapshot) {
  const previous = new Map(before.nodes.map((node) => [node.selector, node]))
  const current = new Map(after.nodes.map((node) => [node.selector, node]))
  const rects = after.nodes.flatMap((node) => {
    const prior = previous.get(node.selector)
    if (!prior) {
      return [
        {
          kind: "added",
          selector: node.selector,
          text: node.text,
          to: node.box,
        },
      ]
    }
    if (changed(prior.box, node.box) || prior.uid !== node.uid) {
      return [
        {
          kind: prior.uid !== node.uid ? "replaced" : "rect",
          selector: node.selector,
          text: node.text,
          from: prior.box,
          to: node.box,
        },
      ]
    }
    return []
  })
  for (const node of before.nodes) {
    if (!current.has(node.selector)) {
      rects.push({
        kind: "removed",
        selector: node.selector,
        text: node.text,
        to: node.box,
      })
    }
  }
  const scroll = after.scroll.flatMap((node) => {
    const prior = before.scroll.find((item) => item.selector === node.selector)
    return prior && (node.top !== prior.top || node.left !== prior.left)
      ? [{ selector: node.selector, from: prior, to: node }]
      : []
  })
  return { from: before.at, to: after.at, rects, scroll }
}
