import { createFileRoute } from "@tanstack/react-router"
import { SignOut } from "@/components/auth/sign-out"
import { BrandLink } from "@/shared/brand/link"
import { RegionPicker } from "@/shared/region/picker"

export const Route = createFileRoute("/auth/sign-out")({
  component: SignOutPage,
})

function SignOutPage() {
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
      <SignOut />
    </main>
  )
}
