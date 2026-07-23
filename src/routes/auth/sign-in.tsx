import { createFileRoute } from "@tanstack/react-router"
import { SignIn } from "@/components/auth/sign-in"
import {
  DataRegionInfo,
  InvitationInfo,
  SignInLegalNotice,
} from "@/shared/auth/guidance"
import { SignInVisual } from "@/shared/auth/visual"
import { BrandLink } from "@/shared/brand/link"
import { RegionPicker } from "@/shared/region/picker"

export const Route = createFileRoute("/auth/sign-in")({
  component: SignInPage,
})

function SignInPage() {
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-2">
      <section className="flex min-h-svh flex-col px-6 py-7 sm:px-10 sm:py-9 lg:px-12 xl:px-16">
        <header className="flex items-center">
          <BrandLink />
        </header>

        <div className="flex flex-1 items-center justify-center py-16">
          <div className="w-full max-w-xs">
            <SignIn
              className="max-w-none gap-0 overflow-visible py-0 ring-0 [--card-spacing:--spacing(0)] [&>[data-slot=card-header]]:mb-6"
              description="Good to see you. Let’s get to work."
              headerContent={
                <div className="mt-7">
                  <RegionPicker
                    labelAction={<DataRegionInfo />}
                    layout="field"
                  />
                </div>
              }
              title="Sign in to Milo"
            />
            <div className="mt-8 space-y-4">
              <div className="flex justify-center">
                <InvitationInfo />
              </div>
              <SignInLegalNotice />
            </div>
          </div>
        </div>
      </section>

      <SignInVisual />
    </main>
  )
}
