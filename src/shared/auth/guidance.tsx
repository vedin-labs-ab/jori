import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { PrivacyChoices } from "../analytics/preferences"
import { marketingUrl } from "../region/paths"

type InfoDialogProps = {
  children: ReactNode
  title: string
  trigger: string
  triggerClassName?: string
}

export function DataRegionInfo() {
  return (
    <InfoDialog title="About data regions" trigger="What's this?">
      <span className="block">
        Your data region determines where Jori stores your account,
        organization, and authentication data.
      </span>
      <span className="mt-3 block">
        Accounts and invitations cannot cross regions. Choose the region your
        organization plans to use; transfers are not available yet.
      </span>
    </InfoDialog>
  )
}

export function InvitationInfo() {
  return (
    <InfoDialog
      title="Joining an organization?"
      trigger="Joining an existing organization?"
      triggerClassName="text-muted-foreground hover:text-foreground"
    >
      <span className="block">
        Sign in with the same Google or Microsoft address that received the
        invitation. Jori will show it after you sign in.
      </span>
      <span className="mt-3 block">
        Can&apos;t find the email? Check spam, then ask the person who invited
        you to resend it.
      </span>
    </InfoDialog>
  )
}

export function SignInLegalNotice() {
  return (
    // Consent copy, so it is set at the smallest size the system actually
    // uses for reading rather than a step below it.
    <p className="text-pretty text-center text-muted-foreground text-xs/relaxed">
      By continuing, you confirm you are at least 18, are acting for business
      purposes with the necessary authority, and agree to Jori&apos;s{" "}
      <LegalLink to="/terms">Terms</LegalLink> and acknowledge the{" "}
      <LegalLink to="/privacy">Privacy Policy</LegalLink>.
      <PrivacyChoices className="ml-1 h-auto px-0 py-0 text-xs" />
    </p>
  )
}

function InfoDialog({
  children,
  title,
  trigger,
  triggerClassName,
}: InfoDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          // Its own target, not a word inside a sentence, so the hit area is
          // grown to the 24px WCAG 2.5.8 asks for. A pseudo-element does it,
          // so the line it sits on keeps its height.
          className={cn(
            'relative h-auto px-0 py-0 after:absolute after:-inset-y-1 after:inset-x-0 after:content-[""]',
            triggerClassName
          )}
          size="sm"
          variant="link"
        >
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton>
        <DialogHeader className="pr-7">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{children}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

function LegalLink({
  children,
  to,
}: {
  children: ReactNode
  to: "/privacy" | "/terms"
}) {
  return (
    <a
      className="underline underline-offset-2 transition-colors hover:text-foreground"
      href={marketingUrl(to)}
      referrerPolicy="no-referrer"
    >
      {children}
    </a>
  )
}
