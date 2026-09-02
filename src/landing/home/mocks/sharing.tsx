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
      lede="Only me, specific people, specific teams, or everyone in the organization. Set it on an item, or set it on the folder and everything inside answers to it. For people outside, send a link that expires."
      support
      title="Share it like a drive"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <dl className="space-y-8">
          <Definition term="The folder is the ceiling">
            Nothing inside a folder reaches further than the folder does,
            whatever it's set to. Over-sharing is silent; the tree isn't.
          </Definition>
          <Definition term="Teams are an audience">
            Group the people who work together once. Then a folder, a table, or
            a job is shared with the team, not a list of names.
          </Definition>
          <Definition term="Links with a clock">
            A share link opens a read-only page without signing in, and expires
            on a clock you choose. Revoke it whenever.
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
        <ClientOnly fallback={<div aria-hidden className="h-52 border-t" />}>
          <MaterialLinks onMint={onMint} onRevoke={onRevoke} shares={shares} />
        </ClientOnly>
      </Prop>
    </div>
  )
}
