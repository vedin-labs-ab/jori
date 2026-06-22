import { createFileRoute } from "@tanstack/react-router"
import { IntegrationSetup } from "@/console/integrations/setup"
import { ConsolePage } from "@/console/page"

export const Route = createFileRoute("/integrations/setup/$token")({
  component: () => {
    const { token } = Route.useParams()

    return (
      <ConsolePage chrome="none" chromeContent={null}>
        {() => <IntegrationSetup token={token} />}
      </ConsolePage>
    )
  },
})
