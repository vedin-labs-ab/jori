import { OrganizationSettings } from "@/components/auth/organization/organization-settings"
import { AccountSettings } from "@/components/auth/settings/account/account-settings"
import { SecuritySettings } from "@/components/auth/settings/security/security-settings"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** The signed-in member's own settings, as a modal over the console. */
export function AccountDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        bodyClassName="overflow-y-auto"
        className="max-h-[85svh] sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>
            Your profile, sign-in methods, and sessions.
          </DialogDescription>
        </DialogHeader>
        <Tabs className="gap-4" defaultValue="account">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          <TabsContent value="account">
            <AccountSettings />
          </TabsContent>
          <TabsContent value="security">
            <SecuritySettings />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

/** Management for the active organization, as a modal over the console. */
export function OrganizationDialog({
  open,
  onOpenChange,
}: SettingsDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        bodyClassName="overflow-y-auto"
        className="max-h-[85svh] sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>Organization</DialogTitle>
          <DialogDescription>
            Profile, members, and invitations for your organization.
          </DialogDescription>
        </DialogHeader>
        <OrganizationSettings />
      </DialogContent>
    </Dialog>
  )
}
