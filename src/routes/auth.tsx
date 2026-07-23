import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
  head: () => ({ meta: [{ title: "Milo · Sign in" }] }),
})

function AuthLayout() {
  return <Outlet />
}
