import { createFileRoute } from "@tanstack/react-router"
import { IntegrationSetupMock } from "@/console/integrations/mock"
import { ConsolePage } from "@/console/page"

export const Route = createFileRoute("/integrations/setup/mock")({
  component: () => (
    <ConsolePage chrome="none" chromeContent={null}>
      {() => <IntegrationSetupMock />}
    </ConsolePage>
  ),
})
