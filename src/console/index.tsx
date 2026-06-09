import { OrganizationCard } from "./identity"
import { ConsolePage } from "./page"

export function Console() {
  return (
    <ConsolePage>
      {(organization) => (
        <section className="grid max-w-2xl gap-4">
          <OrganizationCard organization={organization} />
        </section>
      )}
    </ConsolePage>
  )
}
