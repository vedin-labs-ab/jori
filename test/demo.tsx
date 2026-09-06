import { DemoConsole } from "@/landing/demo/console"
import { useDemoNavigation } from "@/landing/demo/navigation"
import { DemoWorkspaceProvider } from "@/landing/demo/provider"

/** A mock console opened at one path over a fresh workspace, for tests
 *  that drive a single console page the way the landing page shows it.
 *  The sidebar comes along only when a test is about it. */
export function DemoConsoleAt({
  path,
  sidebar = false,
}: {
  path: string
  sidebar?: boolean
}) {
  const navigation = useDemoNavigation(path)

  return (
    <DemoWorkspaceProvider>
      <DemoConsole navigation={navigation} sidebar={sidebar} />
    </DemoWorkspaceProvider>
  )
}
