import { Building2, CreditCard, Users } from "lucide-react"
import { type CSSProperties, lazy, Suspense, useState } from "react"
import { OrganizationPeople } from "@/components/auth/organization/organization-people"
import { OrganizationSettings } from "@/components/auth/organization/organization-settings"
import { OrganizationView } from "@/components/auth/organization/organization-view"
import { AccountSettings } from "@/components/auth/settings/account/account-settings"
import { SecuritySettings } from "@/components/auth/settings/security/security-settings"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const BillingSettings = lazy(() =>
  import("@/console/billing").then((module) => ({
    default: module.BillingSettings,
  }))
)

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export type OrganizationSettingsView = "general" | "people" | "billing"

const organizationViews = [
  {
    description: "Profile and organization controls.",
    icon: Building2,
    label: "General",
    value: "general",
  },
  {
    description: "Members, roles, and invitations.",
    icon: Users,
    label: "People",
    value: "people",
  },
  {
    description: "Plan, usage, and payment settings.",
    icon: CreditCard,
    label: "Billing",
    value: "billing",
  },
] as const

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
  initialView = "general",
  organizationId,
  open,
  onOpenChange,
}: SettingsDialogProps & {
  initialView?: OrganizationSettingsView
  organizationId: string
}) {
  const [view, setView] = useState<OrganizationSettingsView>(initialView)
  const activeView =
    organizationViews.find((item) => item.value === view) ??
    organizationViews[0]

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setView("general")
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        bodyClassName="flex flex-1 overflow-hidden p-0"
        className="h-[calc(100svh-2rem)] sm:h-[min(44rem,calc(100svh-2rem))] sm:max-w-[calc(100%-2rem)] md:max-w-4xl lg:max-w-5xl"
      >
        <SidebarProvider
          className="h-full min-h-0 items-stretch"
          style={{ "--sidebar-width": "13rem" } as CSSProperties}
        >
          <OrganizationSettingsSidebar onViewChange={setView} view={view} />
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <header className="shrink-0 border-b px-4 py-3 pr-12 md:px-6">
              <DialogTitle>{activeView.label}</DialogTitle>
              <DialogDescription>{activeView.description}</DialogDescription>
            </header>
            <OrganizationSettingsMobileNav onViewChange={setView} view={view} />
            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
              <OrganizationSettingsContent
                organizationId={organizationId}
                view={view}
              />
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}

function OrganizationSettingsSidebar({
  onViewChange,
  view,
}: {
  onViewChange: (view: OrganizationSettingsView) => void
  view: OrganizationSettingsView
}) {
  return (
    <Sidebar className="hidden h-full border-r md:flex" collapsible="none">
      <SidebarHeader>
        <div className="flex h-12 items-center gap-2 p-2">
          <OrganizationView className="min-w-0 flex-1" hideRole hideSlug />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {organizationViews.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    isActive={view === item.value}
                    onClick={() => onViewChange(item.value)}
                    type="button"
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

function OrganizationSettingsMobileNav({
  onViewChange,
  view,
}: {
  onViewChange: (view: OrganizationSettingsView) => void
  view: OrganizationSettingsView
}) {
  return (
    <Tabs
      className="shrink-0 border-b p-2 md:hidden"
      onValueChange={(value) => onViewChange(value as OrganizationSettingsView)}
      value={view}
    >
      <TabsList className="grid w-full grid-cols-3">
        {organizationViews.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            <item.icon />
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

function OrganizationSettingsContent({
  organizationId,
  view,
}: {
  organizationId: string
  view: OrganizationSettingsView
}) {
  switch (view) {
    case "general":
      return <OrganizationSettings />
    case "people":
      return <OrganizationPeople />
    case "billing":
      return (
        <Suspense fallback={<Skeleton className="h-56" />}>
          <BillingSettings organizationId={organizationId} />
        </Suspense>
      )
  }
}
