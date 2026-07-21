import { useAuth, useListAccounts } from "@better-auth-ui/react"
import { Card, CardContent } from "@/components/ui/card"
import { Section, SectionHeader } from "@/components/ui/section"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { LinkedAccount } from "./linked-account"

export type LinkedAccountsProps = {
  className?: string
}

/** Linked accounts and available social providers. */
export function LinkedAccounts({ className }: LinkedAccountsProps) {
  const {
    authClient,
    localization,
    multipleAccountsPerProvider,
    socialProviders
  } = useAuth()

  const { data: accounts, isPending } = useListAccounts(authClient)

  const linkedAccounts = accounts?.filter(
    (account) => account.providerId !== "credential"
  )

  const linkedProviderIds = new Set(linkedAccounts?.map((a) => a.providerId))

  const availableProviders =
    multipleAccountsPerProvider === false
      ? socialProviders?.filter((p) => !linkedProviderIds.has(p))
      : socialProviders

  const allRows = [
    ...(linkedAccounts?.map((account) => ({
      key: account.id,
      account,
      provider: account.providerId
    })) ?? []),
    ...(availableProviders?.map((provider) => ({
      key: provider,
      account: undefined,
      provider
    })) ?? [])
  ]

  return (
    <Section className={className}>
      <SectionHeader title={localization.settings.linkedAccounts} />

      <Card className="p-0">
        <CardContent className="p-0">
          {isPending
            ? socialProviders?.map((provider, index) => (
                <div key={provider}>
                  {index > 0 && <Separator />}
                  <AccountRowSkeleton />
                </div>
              ))
            : allRows.map((row, index) => (
                <div key={row.key}>
                  {index > 0 && <Separator />}

                  <LinkedAccount
                    account={row.account}
                    provider={row.provider}
                  />
                </div>
              ))}
        </CardContent>
      </Card>
    </Section>
  )
}

function AccountRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Skeleton className="size-10 rounded-md" />

      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  )
}
