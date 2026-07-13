import { createFileRoute } from "@tanstack/react-router"
import { IntegrationOffer } from "@/console/integrations/offers"
import { ConsolePage } from "@/console/page"

export const Route = createFileRoute("/integrations/offers/$token")({
  component: () => {
    const { token } = Route.useParams()

    return (
      <ConsolePage chrome="none">
        {() => <IntegrationOffer token={token} />}
      </ConsolePage>
    )
  },
})
