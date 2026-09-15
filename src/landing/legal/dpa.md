## Scope and instructions

This Data Processing Agreement forms part of Jori's [Terms of service](/terms)
between the customer and Vedin Labs AB, organisation number 556512-5449,
Braxenvägen 12, 181 30 Lidingö, Sweden. Contact support@usejori.com.
It applies where we process personal data on your behalf under the GDPR.
You are the controller, or a processor authorised by your controller. We are
your processor or subprocessor. This agreement takes priority for that processing.

Your use of Jori, settings and authorised requests are your documented
instructions. We process personal data only on those instructions, including
for transfers, unless applicable EU or member-state law requires otherwise.
We will inform you of such a requirement before processing unless the law
prohibits that notice. We will tell you if an instruction appears to infringe
data protection law and may pause the affected processing while it is resolved.

You determine the purpose of your workspace, provide required notices and have
a lawful basis for the data and instructions you provide. We do not use that
data for our own advertising or general-purpose model training.

## Processing details

- **Purpose and subject matter:** providing Jori's AI workspace and carrying out
  your tasks, including authorised actions in connected services.
- **Operations:** collecting, storing, organising, indexing, retrieving, analysing,
  generating, transmitting and deleting content as instructed.
- **People:** workspace users and people mentioned in customer content,
  such as staff, customers, suppliers and correspondents.
- **Data:** names, contact details, messages, files, calendar entries, code,
  task instructions, outputs, access credentials and associated usage records.
  Actual categories depend on what you provide and connect.
- **Duration:** the service term and the return or deletion period below.
  Intentional sensitive-data repositories require our prior written agreement
  under the Terms; this agreement does not authorise unsupported regulated uses.

## Security and confidentiality

We apply measures appropriate to the risk under GDPR Article 32. These include
access controls for workspaces and service credentials, encrypted transport,
provider encryption at rest, separate regional execution and storage
configuration, isolated sandbox execution and limited operational access.
We maintain incident handling, recovery and security review procedures and
test relevant changes. Measures may evolve without reducing overall protection.

People authorised to process customer data must be bound by confidentiality
obligations and access only what they need for their work. Google API data
also remains subject to Google's Limited Use requirements described in our
[Privacy Policy](/privacy).

## Assistance and incidents

We assist you, taking account of the nature of processing and information
available to us, with data-subject requests, security obligations, breach
notifications, impact assessments and consultation with supervisory authorities.
We forward requests concerning your workspace to you and do not answer on your
behalf unless instructed or legally required.

We notify you without undue delay after becoming aware of a personal data
breach affecting your data. We provide available information about the breach,
affected data and people, likely consequences, mitigation and a contact for
follow-up. We provide further information as it becomes available and cooperate
with your response. You remain responsible for your own regulatory notifications.

## Subprocessors and transfers

You give general written authorisation for subprocessors used to provide Jori.
The providers below describe the current service chain. We require subprocessors
to undertake data protection obligations equivalent to those in this agreement
for their processing and remain responsible for their performance.

We give at least 30 days' notice before adding or replacing a subprocessor,
allowing you to object on reasonable data protection grounds. We work with you
to address the objection. If we cannot, you may end the affected service before
the change and receive a refund of unused prepaid service and purchased credits.

Your workspace region governs the regional configuration described in our
[Privacy Policy](/privacy). It is not a promise that every provider operation
occurs there. Transfers outside the EEA require an applicable lawful mechanism,
such as adequacy or standard contractual clauses with necessary safeguards.
This agreement is not itself an international-transfer mechanism.

## Return, deletion and verification

On ending the service, you may choose return or deletion of your personal data.
Contact support for an export or earlier deletion. Without other instructions,
we retain workspace content for 90 days after cancellation takes effect, give
advance notice, then delete it. We delete existing copies
unless EU or member-state law requires storage. Backup copies remain protected
until overwritten through the applicable deletion cycle and are not restored
to ordinary use. We can confirm completion on request.

We provide information needed to demonstrate compliance with this agreement
and allow and contribute to audits, including inspections, by you or your
mandated auditor. We may agree reasonable scheduling, confidentiality and
security arrangements, but these must not prevent necessary verification or
regulatory access.

## Providers

The location column describes Jori's configuration, not the location of every
provider's support, telemetry or administrative operation. Customer-connected
applications and chosen recipients also process data under their own terms.

| Provider | What it receives and does | Configuration |
| --- | --- | --- |
| [Convex](https://www.convex.dev/legal/privacy) | Workspace records, files and credentials; database, storage and backend | Separate EU and US deployments |
| [turbopuffer](https://turbopuffer.com/docs/security) | Search queries, resource titles, extracted text and resource/access metadata; search index storage and embedding inference | Indexes in Ireland for EU workspaces and North Virginia for US workspaces; embedding inference in the EU or US respectively |
| [Vercel](https://vercel.com/legal/privacy-policy) | Web requests and related operational data; website and application hosting | Regional application configuration; global edge and platform operations |
| [Blaxel](https://blaxel.ai/company/security) | Task files, commands and outputs; isolated code execution | Frankfurt for EU, North Virginia for US |
| [OpenRouter](https://openrouter.ai/privacy/) and its model hosts | Relevant prompts, task context and outputs; AI inference | Regional endpoints with no-training and zero-retention routing requirements |
| [Google Cloud](https://cloud.google.com/terms/cloud-privacy-notice) | Image instructions, inputs and outputs; image generation | Regional endpoints; separate safety-monitoring rules |
| [Parallel](https://parallel.ai/privacy-policy) | Search queries, page URLs and extracted content; search and fetching | EU search endpoint for EU workspaces; global page fetching |
| [Bird](https://bird.com/legal/privacy) | Recipient addresses and service messages; email delivery | Regional account configuration; recipient mail systems are separate |
| [PostHog](https://posthog.com/privacy) | Consented page analytics and browser identifiers | Regional projects; no chat or file content |
| [Stripe](https://stripe.com/privacy) | Billing identity, payment and transaction details | Global processing; also acts as an independent controller for some purposes |
| [Zoho](https://www.zoho.com/privacy.html) | Support correspondence sent to Jori | EU mail account; send only content needed for support |

turbopuffer provides native embedding inference using Cohere Embed v4 through
its [embedding providers](https://turbopuffer.com/docs/security/subprocessors).
Those providers process embedding inputs without training on them or retaining
them beyond the request. This does not remove the stored text and embeddings
from Jori's search index, which follows the return and deletion terms above.

OpenRouter's downstream hosts depend on the selected model and route. Contact
support for the current applicable host list and transfer information. Analytics,
billing and support also involve processing for which Jori or the provider is
an independent controller, as explained in the Privacy Policy.
