import { buttonVariants } from "@/components/ui/button"
import { Prop, Section } from "./section"

export function Trust() {
  return (
    <Section
      className="border-y bg-muted/50"
      lede="Reading your email is a big ask. Milo is built so you never have to take its word for anything."
      title="It asks first"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <dl className="space-y-8">
          <TrustPoint term="Ask-first approvals">
            Sending, posting, changing: anything consequential is requested
            first, and runs only after you approve it.
          </TrustPoint>
          <TrustPoint term="Scoped access">
            Milo works with the accounts you connect, scoped to you or shared
            with the organization. Nothing else.
          </TrustPoint>
          <TrustPoint term="Receipts for every run">
            Every run records what Milo read, what it did, and what it asked.
            Open any run in the console and check.
          </TrustPoint>
        </dl>
        <div className="grid gap-4">
          <ApprovalRequest />
          <RunReceipts />
        </div>
      </div>
    </Section>
  )
}

function TrustPoint({
  children,
  term,
}: {
  children: React.ReactNode
  term: string
}) {
  return (
    <div>
      <dt className="font-medium">{term}</dt>
      <dd className="mt-1.5 max-w-md text-muted-foreground text-sm leading-relaxed">
        {children}
      </dd>
    </div>
  )
}

function ApprovalRequest() {
  return (
    <Prop
      label={
        <>
          <span className="font-medium text-foreground">
            Approval requested
          </span>
          <span>Follow-up sweep</span>
        </>
      }
    >
      <div className="px-5 py-4">
        <p className="font-medium text-sm">
          Send 3 drafted replies from your Gmail
        </p>
        <ul className="mt-3 space-y-1.5 text-muted-foreground text-xs">
          <li>Dan Okafor · Re: year-two pricing</li>
          <li>Sara Vik · Re: backend loop scheduling</li>
          <li>Nadia Reyes, AWS · Re: credits renewal</li>
        </ul>
        <div aria-hidden="true" className="mt-4 flex gap-2">
          <span className={buttonVariants({ size: "default" })}>Approve</span>
          <span className={buttonVariants({ variant: "outline" })}>Deny</span>
        </div>
      </div>
    </Prop>
  )
}

const receipts = [
  { at: "15:30:02", step: "Searched Gmail: 23 open threads" },
  { at: "15:30:41", step: "Drafted 3 replies" },
  { at: "15:31:05", step: "Requested approval to send" },
  { at: "15:47:12", step: "Approved by Maya" },
  { at: "15:47:14", step: "Sent. Run complete.", done: true },
]

function RunReceipts() {
  return (
    <Prop
      label={
        <>
          <span className="font-medium text-foreground">Run receipts</span>
          <span>Follow-up sweep · today</span>
        </>
      }
    >
      <ol className="space-y-2.5 px-5 py-4">
        {receipts.map((receipt) => (
          <li className="flex items-center gap-3" key={receipt.at}>
            <span
              className={`size-1.5 shrink-0 rounded-full ${
                receipt.done ? "bg-primary" : "bg-border"
              }`}
            />
            <span className="flex-1 text-sm">{receipt.step}</span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {receipt.at}
            </span>
          </li>
        ))}
      </ol>
    </Prop>
  )
}
