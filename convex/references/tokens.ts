import { referenceKinds } from "../../contracts/replies/parts"

// A message mentions a resource as `+[kind:id]`, a token the run reads by
// id. Wherever the text is read by a person instead — a conversation's
// title, a run's — the token gives way to the resource's name.

const resourceTokenPattern = new RegExp(
  `\\+\\[(${referenceKinds.join("|")}):([^\\]\\s]+)\\]`,
  "gi"
)

/** The text with each resource token the references name replaced by
 *  that name; a token no reference names stays as it is. */
export function nameMentions(
  text: string,
  references: ReadonlyArray<{ kind: string; id: string; name: string | null }>
) {
  return text.replace(
    resourceTokenPattern,
    (token, kind: string, id: string) => {
      const reference = references.find(
        (candidate) =>
          candidate.kind === kind.toLowerCase() && candidate.id === id
      )

      return reference?.name ?? token
    }
  )
}
