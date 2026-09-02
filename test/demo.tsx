import { DemoConsole } from "@/landing/demo/console"
import { useDemoNavigation } from "@/landing/demo/navigation"
import { DemoWorkspaceProvider } from "@/landing/demo/provider"

/** A mock console opened at one path over a fresh workspace, for tests
 *  that drive a single console page the way the landing page shows it. */
export function DemoConsoleAt({ path }: { path: string }) {
  const navigation = useDemoNavigation(path)

  return (
    <DemoWorkspaceProvider>
      <DemoConsole navigation={navigation} sidebar={false} />
    </DemoWorkspaceProvider>
  )
}
