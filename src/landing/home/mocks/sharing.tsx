import { ClientOnly } from "@tanstack/react-router"
import { MaterialLinks } from "@/shared/console/materials/links"
import { VisibilityFields } from "@/shared/console/visibility/dialog"
import { VisibilityField } from "@/shared/console/visibility/field"
import { materialOf } from "../../demo/derive/materials"
import { DemoAudience } from "../../demo/dialogs/visibility"
import { renewalsTableId } from "../../demo/fixtures/materials/tables"
import { grantOptions } from "../../demo/fixtures/people"
import { Organization } from "../../demo/organization"
import { useDemoShares, useShareActions } from "../../demo/shares"
import { useDemoWorkspace } from "../../demo/workspace"
import { Definition, Prop, Section } from "../../section"

/** Sharing, said three ways beside the sharing dialog's own body over the
 *  renewals table: the field, who it reaches, and the links out. */
export function Sharing() {
  return (
    <Section
      lede="Keep work private, share it with people or teams, or open it to your organization. Set access on folders and individual items. Share read-only links with people outside the organization."
      support
      title="Share it like a drive"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <dl className="space-y-8">
          <Definition term="Folders limit access">
            An item can be shared with fewer people than its folder, but never
            more.
          </Definition>
          <Definition term="Share with a team">
            Group people into teams, then share folders and items with the whole
            team.
          </Definition>
          <Definition term="Choose when links expire">
            A share link opens a read-only page without signing in. Set an
            expiry time or revoke the link whenever you need to.
          </Definition>
        </dl>
        <RenewalsSharing />
      </div>
    </Section>
  )
}

/** The sharing dialog's body and the share links dialog's body, in place,
 *  over one table. A change lands at once; the links are kept off the
 *  server render since their times are the reader's clock's. */
function RenewalsSharing() {
  const { actions, state } = useDemoWorkspace()
  const table = materialOf(state, renewalsTableId)
  const shares = useDemoShares(renewalsTableId)
  const { onMint, onRevoke } = useShareActions(renewalsTableId, "table")

  if (table === undefined) {
    return null
  }

  const target = { kind: "table" as const, id: table.id }

  return (
    <div className="grid min-w-0 gap-6">
      <Prop
        hint={
          <>
            Who in <Organization /> sees the Customer renewals table
          </>
        }
        label="Visibility"
      >
        <div className="p-4">
          <VisibilityFields
            audience={<DemoAudience target={target} value={table.visibility} />}
            canEdit
            field={
              <VisibilityField
                id="renewals-visibility"
                noun="table"
                onChange={(visibility) =>
                  actions.setVisibility(target, visibility)
                }
                options={grantOptions}
                value={table.visibility}
              />
            }
          />
        </div>
      </Prop>
      <Prop
        hint={
          <>
            The same table, for people outside <Organization />
          </>
        }
        label="Share links"
      >
        {/* The dialog body draws its own top rule under the dialog's
            header; here the card's caption already draws that line. */}
        <div className="[&>*:first-child]:border-t-0">
          {/* h-42 is the links body's own height, measured in the browser
              at viewports 360 through 1920, where it is 166px at every
              one, so the card keeps its size when the links arrive. */}
          <ClientOnly fallback={<div aria-hidden className="h-42" />}>
            <MaterialLinks
              onMint={onMint}
              onRevoke={onRevoke}
              shares={shares}
            />
          </ClientOnly>
        </div>
      </Prop>
    </div>
  )
}
