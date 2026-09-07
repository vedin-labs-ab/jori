import { BookOpen, Wrench } from "lucide-react"
import { ProviderLogo } from "@/shared/logo/provider"
import { type NamedMentionKind } from "./scan"

/** The mark a named mention wears, in a chip and in the listbox alike:
 *  an integration's logo, a skill's book, and for a tool the logo of the
 *  integration it belongs to when the caller knows it, its wrench
 *  otherwise. The caller sizes and tints it through `className`; a
 *  resource's mark is its kind's, from `referencePresentation`. */
export function MentionKindIcon({
  className,
  id,
  kind,
  surface,
}: {
  className: string
  id: string
  kind: NamedMentionKind
  surface?: string
}) {
  switch (kind) {
    case "integration":
      return <ProviderLogo className={className} surface={surface ?? id} />
    case "skill":
      return <BookOpen aria-hidden="true" className={className} />
    case "tool":
      return surface === undefined ? (
        <Wrench aria-hidden="true" className={className} />
      ) : (
        <ProviderLogo className={className} surface={surface} />
      )
  }
}
