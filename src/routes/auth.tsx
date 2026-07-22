import { createFileRoute, Outlet } from "@tanstack/react-router"
import { BrandLink } from "@/shared/brand/link"
import { RegionPicker } from "@/shared/region/picker"

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
      <div className="flex flex-col items-center gap-2">
        <RegionPicker />
        <p className="text-center text-muted-foreground text-xs">
          Accounts and organizations stay in their selected region.
        </p>
      </div>
      <Outlet />
    </main>
  )
}
