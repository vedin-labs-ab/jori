import { useMutation } from "convex/react"
import { Globe2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import { api } from "../../../../../../convex/_generated/api"
import { showErrorToast } from "../../../../shared/error"
import { type WebsiteItem } from "../../discovery/url"

/**
 * One chip style for every domain: a secondary link button with an optional
 * inverted badge. A removable chip becomes a button group — link and remove
 * are separate, full-height targets with a seam between them.
 */
export function WebsiteChip({
  badge,
  onRemove,
  website,
}: {
  badge?: string
  onRemove?: () => void
  website: Pick<WebsiteItem, "href" | "label">
}) {
  const chip = (
    <Button
      asChild
      className="h-8 justify-start gap-2 px-2.5 text-xs"
      size="sm"
      variant="secondary"
    >
      <a href={website.href} rel="noreferrer" target="_blank">
        <Globe2 className="size-3.5" />
        <span>{website.label}</span>
        {badge === undefined ? null : (
          <Badge
            className="border-transparent bg-background dark:bg-background"
            variant="outline"
          >
            {badge}
          </Badge>
        )}
      </a>
    </Button>
  )

  if (onRemove === undefined) {
    return chip
  }

  return (
    <ButtonGroup>
      {chip}
      <ButtonGroupSeparator />
      <Button
        aria-label={`Remove ${website.label}`}
        className="h-8 px-2"
        onClick={onRemove}
        size="sm"
        type="button"
        variant="secondary"
      >
        <X className="size-3.5" />
      </Button>
    </ButtonGroup>
  )
}

/** A user-added domain: the same website chip, plus Added badge and remove. */
export function DeclaredDomainChip({
  domain,
  organizationId,
}: {
  domain: string
  organizationId: string
}) {
  const retractDomain = useMutation(api.organization.profile.retractDomain)

  const onRemove = async () => {
    try {
      await retractDomain({ organizationId, domain })
    } catch (error) {
      showErrorToast(error, "Could not remove that domain.")
    }
  }

  return (
    <WebsiteChip
      badge="Added"
      onRemove={() => void onRemove()}
      website={{ href: `https://${domain}`, label: domain }}
    />
  )
}
