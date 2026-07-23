import { Link } from "@tanstack/react-router"
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
        Your data region determines where Milo stores your account,
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
        invitation. Milo will show it after you sign in.
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
    <p className="text-pretty text-center text-[0.625rem]/relaxed text-muted-foreground">
      By continuing, you agree to Milo&apos;s{" "}
      <LegalLink to="/terms">Terms</LegalLink> and acknowledge the{" "}
      <LegalLink to="/privacy">Privacy Policy</LegalLink>.
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
          className={cn("h-auto px-0 py-0", triggerClassName)}
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
    <Link
      className="underline underline-offset-2 transition-colors hover:text-foreground"
      to={to}
    >
      {children}
    </Link>
  )
}
