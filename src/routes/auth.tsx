import { createFileRoute, Outlet } from "@tanstack/react-router"
import { BrandLink } from "@/shared/brand/link"

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
  head: () => ({ meta: [{ title: "Milo · Sign in" }] }),
})

function AuthLayout() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-8 px-6 py-12">
      <div className="self-center">
        <BrandLink />
      </div>
      <Outlet />
    </main>
  )
}
