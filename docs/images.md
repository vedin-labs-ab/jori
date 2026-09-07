# Regional image generation

The image tool sends text prompts directly to Google Vertex AI using
`gemini-3.1-flash-image` (Nano Banana 2). This replaces its OpenRouter image edge;
ordinary model turns still use regional OpenRouter. There is no global fallback.

## Configuration and routing

Set `VERTEX_PROJECT_ID`, `VERTEX_CLIENT_EMAIL`, and `VERTEX_PRIVATE_KEY` in the
owning Convex deployment. Each deployment uses its own Google Cloud project and
service account, including development. The account must belong to the configured
project. These settings are optional for deploying the rest of Jori, but all are
required when invoking the image tool. Missing configuration fails before any
prompt is sent.

`JORI_REGION` determines both the hostname and resource location:

- EU: `https://aiplatform.eu.rep.googleapis.com/v1/projects/PROJECT/locations/eu/publishers/google/models/gemini-3.1-flash-image:generateContent`
- US: `https://aiplatform.us.rep.googleapis.com/v1/projects/PROJECT/locations/us/publishers/google/models/gemini-3.1-flash-image:generateContent`

The runtime service account needs only `aiplatform.endpoints.predict`, granted by
a project custom role. An RS256 service-account assertion obtains a short-lived
OAuth access token. The token exchange uses Google's global authentication service
and contains service-account identity, not prompts or images. Tokens are cached
only in process and renewed before expiry. Private keys belong only in deployment
secrets. This code does not claim that the credential itself prevents inference
in another region: the fixed adapter endpoint enforces routing.

Sources: [model locations and processing](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-1-flash-image),
[jurisdiction endpoints](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/locations),
[minimum prediction permission](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/access-control),
[service-account authentication](https://developers.google.com/identity/protocols/oauth2/service-account).

## Data handling

The model supports EU and US ML processing. Google's data-location terms cover
selected-region storage and ML processing for supported models, not every account
attribute or service datum. Disable project implicit caching, leave request/response
logging off, and do not add grounding or other features without reviewing their
retention terms. Suspected-abuse prompts may be retained for up to 90 days and
reviewed by people; Google says these logs stay in the selected region or
multi-region. This is regional processing, not an unconditional zero-retention claim.

Only inline image data is accepted. The adapter never follows remote image URLs,
redirects, or falls back to another endpoint. Errors retain HTTP status, not provider
response bodies that could echo customer input. Jori stores images through its
existing regional Convex file path and also copies them into the run's E2B sandbox.
The documented E2B regional-processing exception therefore still applies.

Sandbox imports carry only the file ID and workspace path between Convex runtimes.
The Node action verifies that the file belongs to the run and organization, reads
the owning deployment's blob directly, and writes it to that run's sandbox. It
does not create a download URL or accept a network source URL. This accommodates
Jori's 25 MiB file limit without putting image bytes into a Node action's 5 MiB
argument budget. If the sandbox copy fails, the generated file and usage receipt
remain in regional storage; the tool reports the failure.

Sources: [service-specific terms](https://cloud.google.com/terms/service-terms),
[zero-retention configuration](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention),
[abuse monitoring](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/abuse-monitoring).

Transport limit: [Convex function arguments](https://docs.convex.dev/production/state/limits).

## Usage and failure semantics

Requests use one candidate, 1K image size, and an 8192 output-token cap. There are
no automatic provider retries. The adapter prices actual reported input, cached
input, text/thinking output, and image output separately at the standard regional
list rates verified September 7, 2026: $0.55, $0.055, $3.30, and $66 per million
tokens respectively. A 1K image uses 1120 image tokens, or $0.07392 before input
and text/thinking. These versioned rates must be reviewed when Google changes
pricing or the model changes.

Provider usage is recorded before file writes, including a successful model
response without an image. Content-free `usageReceipts` deduplicate accounting by
provider and response ID, including after a run stops. The existing run ledger,
organization balance, and usage rollups receive the same charge. Receipts remain
in the owning deployment alongside billing history; they contain no prompts or
images. The normal model-turn context-token counter is not changed by image work.

Missing/inconsistent usage metadata fails visibly instead of inventing a charge.
A transport interruption, malformed response, or failed accounting write can still
leave an upstream charge that Jori cannot reconcile automatically. This is not an
exactly-once guarantee for the external inference operation. Provider billing must
be monitored for these cases.

Sources: [pricing](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing),
[response usage fields](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rest/v1/GenerateContentResponse).
