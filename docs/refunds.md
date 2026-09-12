# Support refunds

[Launch policies](legal.md)

Refunds are reviewed by support. The internal workflow reserves Jori credits,
verifies the resulting Stripe refund and keeps an audit record. It never sends
money automatically. Use the customer's regional deployment and one operator
per case; never run a second Dashboard refund because a command timed out.

Run commands from the primary checkout with the existing environment wrapper:

```sh
node --experimental-strip-types scripts/env/index.ts prod-eu -- pnpm exec convex run billing/refunds/data:freeze '{"organizationId":"ORG","caseId":"CASE"}'
```

Use `dev`, `prod-eu` or `prod-us` as appropriate. The same wrapper applies to each
function below. Deployment credentials authorise these internal functions;
customer sessions cannot call them. Never paste API keys into arguments.

1. **Freeze:** `billing/refunds/data:freeze` with `organizationId` and a unique
   `caseId`. This blocks new work, checkout and auto top-ups while existing work
   settles. Stop the subscription in Stripe, expire open Checkout sessions and
   settle pending payments. Wait for the cancellation webhook, all workflows
   (including stopped runs), and at least 35 minutes after freezing so late usage
   callbacks drain. Repeating freeze does not restart that waiting period.
2. **Review:** `billing/refunds/data:inspect` with `organizationId` and
   `paginationOpts: {numItems: 100, cursor: null}`. Follow `continueCursor` until
   `isDone`. Verify the requester, original charge, first-purchase date, refund
   request date, prior refunds, tax and discounts in Stripe.
3. **Reserve:** `billing/refunds/actions:prepare` with the reviewed fields below.
   The command checks the charge/customer, Stripe subscription/payment state,
   available balances and unsettled runs. Wallet refunds also require the exact
   original payment to have a credited top-up receipt; prior reservations and
   refunds cannot exceed that purchase. Credits are removed atomically before
   money leaves Stripe. Repeating identical arguments does not remove them twice.
4. **Refund:** inspect `billing/refunds/data:read` with `caseId`; proceed only if
   it is `reserved` and Stripe has no refund for this case already. Refund the
   specified amount from the original charge in Stripe. Use a credit note where
   required for the invoice/tax adjustment. Record the case ID in Stripe's notes.
5. **Reconcile:** `billing/refunds/actions:reconcile` with `caseId` and Stripe's
   `refundId`. It requires a successful refund for the same charge, customer,
   currency and amount. Pending or failed refunds keep the reservation held.
6. **Release:** `billing/refunds/actions:release` with `organizationId` and
   `caseId`. After reconciliation this removes the hold without restoring
   refunded credits. For an abandoned reservation, it restores credits only if
   Stripe shows no new completed refund or pending refund. Auto top-ups remain
   off. A released reservation cannot be reused.

If money was refunded before reservation, or a second operator changed the charge
mid-case, stop and reconcile the evidence with support engineering. Do not restore
credits manually or create another case to work around a failed verification.
A refund does not delete the workspace; follow its retention/deletion process.

## Reservation fields

| Field | Meaning |
| --- | --- |
| `organizationId`, `caseId` | Workspace and unique refund attempt. Use a new case for each charge. |
| `chargeId` | Original successful Stripe charge, `ch_…`. |
| `amountMinor`, `currency` | Actual money to refund in the charge's minor currency units, including reviewed tax adjustments. |
| `allowanceMicros` | Included credits to remove. For a canceled first subscription, remove the remaining allowance, including any free carry. |
| `walletMicros` | Purchased credits represented by this refund. Never include separately purchased credits in the subscription calculation. |
| `calculation`, `operator` | Short accounting explanation and responsible operator. No chats or other task content. |

Credits use integer micro-dollars: $1 = 1,000,000 micros. Money and credit
amounts are deliberately separate, since discounts and tax can make them differ.

For the first-subscription offer, check the request arrived within 14 days of the
first purchase, including annual purchases. Compute paid included usage after
subtracting free trial carry and promotional usage first. Ledger debit rows record
`micros.allowance`; the remainder of each debit is wallet usage. A first plan grant
includes the remaining trial allowance, so do not count that free carry as paid.
For example, $8 allowance usage with $3 free carry consumes $5 paid allowance;
a $30 payment with no tax or discounts refunds $25. Remove the remaining
allowance, but leave unrelated wallet credits untouched.

For a wallet refund at closure, allocate remaining wallet value to its original
purchases and subtract prior refunds. Do not refund more credit value than the
current wallet or more money than the charge's remaining paid amount. The
workflow enforces those balance/payment caps; eligibility, free-credit allocation,
invoice tax adjustments and the calculation remain the operator's responsibility.

Late paid subscriptions received after workspace deletion starts are canceled
without issuing a refund or generating a final invoice/proration. Their session
and subscription IDs remain in `billingCancellations`, visible in `inspect`.
Failures retain their error and retry every five minutes. Review the original
payment for a support refund before releasing its `late-payment:…` hold.
