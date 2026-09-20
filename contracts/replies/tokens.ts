import {
  type ReferenceKind,
  type ReferenceTarget,
  referenceKinds,
} from "./references"

// A message mentions a resource as `+[kind:id]`: the kind and the id ride
// inside the brackets, so a token needs no catalog and can never be prose
// by accident. The composer and the server read the same grammar.

const resourceTokenSource = `\\+\\[(${referenceKinds.join("|")}):([a-z0-9_-]+)\\]`

/** A resource token at the start of a text. */
export const resourceTokenPattern = new RegExp(`^${resourceTokenSource}`, "i")

/** Every resource token in a text whose `+` starts the text or follows
 *  whitespace: quoted examples, sums, and paths stay text, as they do in
 *  the composer. */
export const resourceTokensPattern = new RegExp(
  `(?<![^\\s])${resourceTokenSource}`,
  "gi"
)

export function resourceToken(target: ReferenceTarget) {
  return `+[${target.kind}:${target.id}]`
}

/** The target a text names as one resource token and nothing else, or
 *  nothing for a text of another shape. */
export function parseResourceToken(text: string): ReferenceTarget | null {
  const match = resourceTokenPattern.exec(text)

  return match === null || match[0].length !== text.length
    ? null
    : { kind: match[1].toLowerCase() as ReferenceKind, id: match[2] }
}

// A message mentions a resource as `+[kind:id]`, a token the run reads by
// id. Wherever the text is read by a person instead — a conversation's
// title, a run's — the token gives way to the resource's name.

/** The text with each resource token the references name replaced by
 *  that name; a token no reference names stays as it is. */
export function nameMentions(
  text: string,
  references: ReadonlyArray<{ kind: string; id: string; name: string | null }>
) {
  return text.replace(
    resourceTokensPattern,
    (token, kind: string, id: string) => {
      const reference = references.find(
        (candidate) =>
          candidate.kind === kind.toLowerCase() && candidate.id === id
      )

      return reference?.name ?? token
    }
  )
}
