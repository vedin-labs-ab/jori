import { WaitlistForm } from "@/landing/waitlist/form"
import { PublicConsoleFrame } from "./public"

/**
 * Signed in, but Milo is not open to this address yet.
 *
 * Getting this far means the account is real and the email is known, so the
 * page skips the sales pitch and does the one useful thing left: puts them on
 * the list with the address they just proved they own. Nothing here enforces
 * anything; Better Auth already refused to open an organization.
 */
export function LaunchGate({ email }: { email: string | null }) {
  return (
    <PublicConsoleFrame isSignedIn>
      <section className="grid max-w-xl gap-4">
        <div className="grid gap-1.5">
          <h1 className="font-medium text-2xl tracking-tight">
            Milo isn't open yet.
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You're signed in{email === null ? "" : ` as ${email}`}, and we're
            letting teams in a few at a time so we can set each one up
            ourselves. Tell us what your team does by hand and we'll come find
            you.
          </p>
        </div>
        <div className="mt-2">
          <WaitlistForm defaultEmail={email ?? undefined} />
        </div>
      </section>
    </PublicConsoleFrame>
  )
}
