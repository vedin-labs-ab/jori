# Regional model availability

Each Convex deployment owns its OpenRouter account key and `JORI_REGION`.
Both inference and catalog requests use that region's API origin. There is no
global endpoint fallback.

`convex/model/eligibility.ts` reads the authenticated `/models/user` catalog.
OpenRouter documents this endpoint as filtered by account privacy settings,
provider preferences and guardrails, with EU routing applied on the EU origin.
[OpenRouter model API](https://openrouter.ai/docs/client-sdks/typescript/api-reference/models/models)

The adapter requests all output modalities, validates the response with the SDK,
and caches it for at most 60 seconds per account key and regional origin. A failed
refresh never authorizes models from an expired cache. Cold starts fetch directly,
so no separate database bootstrap or manually maintained regional model list is
needed. The read request contains credentials, but no customer prompt content.

One eligibility path serves three consumers:

- The authenticated console action returns only supported Jori chat-model slugs.
- The picker hides unavailable recommendations and models. Sending is disabled
  while availability is unknown or the selected model is unavailable.
- Inference rejects any unavailable candidate before sending prompt bodies.
  Pricing refresh updates only eligible models in Jori's priced chat catalog.

The shared default remains GPT-5.6 Sol. Every background call using that default
passes through the same eligibility check. The system never silently changes a
selected model to satisfy residency. Other capabilities, including image
generation, must also have a model in the regional catalog.

Catalog eligibility is not a guarantee of live capacity or support for every
parameter combination. Each inference request independently enforces
`require_parameters=true`, `data_collection=deny`, and `zdr=true`. Provider
failures remain errors, without weakening those requirements.
[Provider routing](https://openrouter.ai/docs/guides/routing/provider-selection)

Callers specify their output budget without vendor-specific branching. The
OpenRouter adapter selects `max_completion_tokens` or `max_tokens` from the
eligible models' supported parameters. It does not discard a limit when no
compatible spelling exists. This matters because current regional OpenAI
endpoints advertise the former, while Anthropic endpoints advertise the latter.
[Supported parameters](https://openrouter.ai/docs/guides/overview/models)

## Verification on September 7, 2026

Authenticated regional catalogs and SDK response validation succeeded in EU and
US. Short synthetic Luna requests, Sol strict JSON-schema requests and Sol tool
calls all returned HTTP 200 in both regions with valid results and all privacy
requirements enabled. OpenAI probes used `max_completion_tokens`.

EU's catalog excluded Astra, Mini and Nano at verification time. These exclusions
are discovered at runtime, not encoded as permanent geographic assumptions.
Neither authenticated regional catalog advertised an image-output model under
the current guardrails. Later synthetic requests to each regional Image API for
`google/gemini-3.1-flash-image`, pinned to Vertex with fallback disabled, both
returned 404: `No endpoints found supporting your data region.` The response
identified the data-region filter as the failing step. No image was generated.

## Regional image generation investigation

The user requires regional image processing; a global exception is not approved.
The current OpenRouter shared endpoints do not satisfy that requirement for
Nano Banana. Regional image catalog discovery alone is insufficient evidence:
the dedicated image-model listing returned models that actual regional inference
rejected.

OpenRouter supports regional Vertex BYOK, but customers must configure their own
Google location correctly. Its published examples do not establish support for
Google's EU/US jurisdictional REP endpoints. Verify that exact route before
choosing BYOK; do not assume a regional gateway makes a global upstream regional.
[OpenRouter regional routing](https://openrouter.ai/docs/guides/features/in-region-routing).

Direct Google Cloud `gemini-3.1-flash-image` is a documented candidate. Its model
page lists EU and US ML processing. The matching endpoint hosts are
`aiplatform.eu.rep.googleapis.com` and `aiplatform.us.rep.googleapis.com`, with
locations `eu` and `us`. Separate Google projects and identities would bind each
deployment to its endpoint. No Google image resources have been provisioned or
tested for Jori yet.
[Model availability](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-1-flash-image),
[Endpoints](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/locations).

Google's covered-service terms commit customer-data storage and ML processing
to the configured multi-region, with exclusions for resource identifiers and
labels. Regional processing is not zero retention: abuse monitoring may retain
flagged prompts for up to 90 days in-region, unless an exemption is approved.
Do not silently weaken Jori's retention requirements to enable the model.
[Service terms](https://cloud.google.com/terms/service-terms),
[Abuse monitoring](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/abuse-monitoring).
