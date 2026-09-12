# Launch policies

[Docs index](index.md) · [Residency](residency.md)

## Decisions

Jori launches for businesses, including freelancers and sole traders. Users must
be 18 or older and authorised to act for the business. State this at signup and
require confirmation before purchase. Do not infer business status from an email
domain or VAT number alone.

Vedin Labs AB, 556512-5449, Braxenvägen 12, 181 30 Lidingö, Sweden provides Jori.
Use support@usejori.com for support, legal notices and privacy requests.

The website's Terms, Privacy Policy and DPA are the customer documents. Keep
provider configuration and contractual evidence in the residency guide and
provider register. Do not copy policies from other companies or claim counsel
reviewed ours without evidence. Bump `contracts/legal/version.ts` when purchase terms
change. Preserve dated terms accepted by existing customers in Git.

## Refunds, handled through support

- Within 14 days of the first subscription purchase, refund the payment less
  paid included credits already used. This applies to monthly and annual plans.
  The window does not restart on renewal.
- Refund unused separately purchased credits when the workspace closes.
- Free trial and promotional credits have no cash value. Do not deduct their
  usage from a paid refund. The billing ledger carries unused trial credits into
  the first paid month; treat that free allowance as spent before paid allowance.
- Example: $30 subscription, $15 included credits, $5 paid included usage means
  a $25 subscription refund. A separate $50 top-up with $10 used refunds $40.

Verify the requester, purchase and refund history. Stop renewal and auto top-ups,
settle in-flight usage, then calculate the remaining paid value from Stripe and
the regional ledger. Account for discounts, tax and prior refunds. Do not refund
more than was paid or deduct the same usage twice. Refund through the original
payment method and remove refunded balances before restoring any access.
Use the [support refund workflow](refunds.md) to reserve credits before the
Stripe refund, verify it succeeded, and release the hold. It records the refund
ID and calculation without exposing a customer-facing refund API.

## Retention and deletion

Keep workspace content for 90 days after cancellation takes effect or a trial
expires, with notice before deletion and earlier deletion through support.
A request to cancel renewal is not the start date while the subscription remains
active. Reactivation stops the retention countdown.

Deletion must cover chats, files and storage objects, imported content, context,
run transcripts and traces, integration tokens, jobs, pending deliveries, shares
and workspace membership. Stop work and disconnect integrations first. Keep
other workspaces and their users intact. Keep only the billing evidence required
for accounting, separated from task content. Ask providers to delete retained
copies where required, and record backup expiry limits.

Owners can export visible content from Settings or request a complete controller
export through support. See [Exports](export.md) for scope and operator commands.

The regional retention sweep detects expired trials and effective cancellations.
It requires an accepted email notice and at least seven days before automatic
deletion. Reactivation cancels the countdown. Missing notice delivery or an open
refund case requires support attention; inspect the retention record's reason.

Deletion blocks access and background writes immediately, disconnects integrations
and stops jobs and runs. It waits for external work to drain, then deletes content,
storage and workspace membership in retryable batches. Accounting records and a
minimal deletion marker remain. Unused purchased credit remains refundable after
automatic deletion. Unregistered uploads are reclaimed after a 24-hour grace
period. Provider backups and independently retained copies follow their own
verified deletion procedures; this workflow cannot erase data in customer apps.

## Publication checks

- support@usejori.com receives mail, confirmed by Albin. Assign ownership of requests.
- Use the verified export/deletion and [refund procedures](refunds.md) for support requests.
- Parallel's [customer terms](https://parallel.ai/customer-terms), section 4,
  require a separately executed DPA and contain broad training permissions.
  Its [privacy policy](https://parallel.ai/privacy-policy) separately promises
  no retained request/response content for EU Search. Resolve the applicable
  contract before making a provider-wide no-training claim.
- OpenRouter incorporates a DPA into commercial terms, but its
  [DPA](https://openrouter.ai/data-processing-agreement), sections 2.6 and 5.2,
  restricts sensitive data broadly and excludes model hosts from ordinary
  subprocessor change notices. Verify permitted workplace data and a host
  approval/notification process before promising our own 30-day notice.
- Verify provider agreements, downstream model hosts, transfer safeguards,
  retention and backup limits. A regional endpoint is configuration evidence,
  not a signed DPA. The DPA's obligations must be supported by actual agreements.
- Review tax registrations and customer-facing Stripe branding before charging.
  Existing subscription checkout enables automatic tax; that alone does not prove
  an active tax registration or correct treatment of credit top-ups.
- Give the final documents a focused Swedish legal review where needed,
  particularly liability, processor terms and actual cross-border processing.
  These drafts have not been reviewed by counsel.

Keep the provider agreement checks open until there is supporting evidence.
Changing to consumer sales later requires a fresh checkout and withdrawal review;
do not just remove the business-use sentence.
