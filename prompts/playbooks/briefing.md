Prepare every eligible meeting in the configured window so the requester knows why it matters now, what changed, and what to decide, ask, or do. Honest, actionable preparation beats background.

## Meetings

Scan every readable calendar on @{{providers.calendar}} — expanded events, no calendar ID — from now through 26 hours ahead. Provider `gaps` or `truncated` mean incomplete coverage; record scan status `failed` or `partial` accordingly. Exclude cancelled and all-day events, focus time, solo holds, meetings already under way, declined invitations, and explicit private/confidential visibility.

Be lenient about professional sensitivity. Board and investor meetings, commercial negotiations, recruiting interviews, customer escalations, and ordinary confidential work remain eligible; sanitize what is stored. Exclude only clearly personal or exceptionally sensitive matters where a shareable briefing is inappropriate: medical or therapy appointments, personal legal or financial matters, credentials or secrets, and disciplinary, termination, harassment, or formal investigation meetings. Delete a stored meeting that enters an excluded class.

{% if options.meetings == "external" %}Keep every otherwise eligible meeting with an attendee outside the requester's organization.{% elsif options.meetings == "internal" %}Keep internal meetings where preparation could affect a decision, risk, commitment, or useful question.{% else %}Keep every eligible external meeting and internal meeting where preparation could affect a decision, risk, commitment, or useful question.{% endif %}

## State

A meeting's key is `mb:` plus the event's `entityKey`; store its stamped `provider`, `contentHash`, and calendar and event IDs for re-reads. A new meeting is `queued` at revision 0; a changed `contentHash` on re-read makes preparation `stale`; increment revision only when user-visible content changes, and never overwrite a newer `contentHash` or revision. Keep up to 60 eligible meetings — state a coverage gap if more qualify — preferring upcoming over recently ended. Store only safe, sanitized event facts and the most relevant non-requester attendees; when space runs short, reduce detail, never coverage. Every stored point cites a retained sanitized source, recommendations and calendar-derived facts included.

For a stored upcoming event missing from discovery, get it by stored provider, calendar, and event ID; cancel only on provider-confirmed cancellation, deletion, or non-attendance, and preserve it with a gap when the read fails.

## Research

Deep-research up to 20 highest-impact meetings, ranked by expected effect on the meeting, not ease of research; every other eligible meeting still gets a sparse or partial briefing from verified event context and explicit gaps. Never omit one because research is thin or a child failed. With morning delivery off, leave future meetings to their reminders.

Research directly for a single meeting or an imminent deadline: search @{{providers.email}}, opening only useful full messages. Otherwise mark each meeting `researching` and #start_agent one child per meeting with only email read and web tools, handing it the meeting key, `contentHash`, and full event. The child researches its meeting only, returns findings that distinguish fact, inference, and recommendation with cited sanitized sources and explicit gaps, and writes no artifact state. Call #wait_for_agents once for all children; accept a result only when its stated `contentHash` still matches the stored event, and count a failed, timed-out, or mismatched child as an explicit gap.

The coordinator alone writes meetings: fill the briefing fields the evidence supports and set preparedAt, preparedForContentHash, and status honestly. At least one item must change what the requester should decide, ask, say, notice, or do.

## Delivery

The scheduled planner protects configured delivery targets before calendar discovery or research; a target automation may create only its keyed retry or a moved-event replacement. Create each with personal scope, this artifact, a key containing the parent automation ID, and only the tools it needs. Retry a confirmed #add_automation failure once; if protection still fails, deliver directly after preparation rather than losing the window.

{% if options.morning %}The morning target is {{options.morningTime}}, exactly 30 minutes after the planner trigger. Its window starts strictly after that target and ends at the next local day's target, inclusive; compute each UTC boundary from its local date. A still-upcoming meeting at or before today's target belongs to the prior window—prepare and deliver it directly if undelivered.

When today's target is future, create or find one automation keyed `meeting-briefing:<parent automation ID>:morning:<target UTC>`. It owns delivery. Give it these complete instructions with literal target, window, and planner-trigger UTC values:

```txt
Deliver one Morning Briefing for meetings starting after <coverage start UTC> and at or before <coverage end UTC>.

Read the `briefings` artifact state and re-read every candidate event by its stored calendar ID and event ID on @{{providers.calendar}}. Update safe event facts; a changed `contentHash` marks preparation stale. Exclude cancelled, private, sensitive, underway, changed, or already-receipted meetings.

If `scan.scannedAt` is missing or before <planner trigger UTC>, the scan horizon does not cover this window, or any candidate is still queued or researching, create one retry for ten minutes from now, but no later than 20 minutes after the target, keyed `meeting-briefing:<parent automation ID>:morning-retry:<target UTC>`, with these same literal instructions; exit once it is created or found. If retry scheduling fails, or this is already the retry or cutoff, continue with available verified work and report the missing coverage once.

Include every verified ready, partial, or sparse meeting chronologically; each needs at least one point that changes what the requester will decide, ask, say, or do — calendar facts alone are not a briefing. Summarize all scan, research, stale, or failed gaps in one compact coverage line. Create one 36-hour #share_artifact link, preserving its `#share=` fragment; append `&m=<URL-encoded meeting key>` for deep links. {{delivery}}

Before the provider call, claim `dispatches["morning:<parent automation ID>:<target UTC>"]` with #update_artifact_state — one claim covering either the digest or its failure-only notice — as a `sending` dispatch of kind `morning` or `failure`; change an aged `sending` claim to `unknown`. On confirmed success, atomically mark the dispatch delivered and add `delivery.morning` receipts for every included current revision/start. Retry once only on a provider rejection known to precede acceptance; record a confirmed rejection as `failed` and an ambiguous outcome as `unknown`. Never write a meeting receipt without confirmed success.
```
{% endif %}

{% if options.beforeMeeting %}For every eligible meeting, create a one-time reminder at start minus {{options.leadMinutes}} minutes when future, keyed `meeting-briefing:<parent automation ID>:event:<meeting key>:<start UTC>`. If already inside that window, prepare and deliver it now. Give each automation these complete instructions with literal IDs and times:

```txt
Prepare and, when useful, deliver the assigned meeting: key <meeting key>, calendar <calendar ID or default>, event <event ID>, expected start <start UTC>, parent <parent automation ID>.

Read the `briefings` artifact state and get the full event by that calendar and event ID from @{{providers.calendar}}. Update safe event facts; a changed `contentHash` marks preparation stale, and a read failure preserves prior work. Delete a private or sensitive event; cancel only on provider-confirmed cancellation or non-attendance. If the meeting moved and the new reminder time is future, create one replacement keyed `meeting-briefing:<parent automation ID>:event:<meeting key>:<new start UTC>` with these refreshed instructions. Do not deliver an underway, stale, changed, or already-receipted meeting.

Search @{{providers.email}} and the public web for what changes the requester's approach; stop when more searching is unlikely to change the briefing. Write only this meeting; every final point cites a retained sanitized source and distinguishes fact, inference, and recommendation. Set preparedAt/preparedForContentHash and ready, partial, sparse, failed, or stale honestly. Create a 36-hour #share_artifact deep link. {{delivery}}

Before sending, claim `dispatches["reminder:<parent automation ID>:<meeting key>:<start UTC>:<revision>"]` with #update_artifact_state as a `sending` dispatch of kind `reminder`; change an aged `sending` claim to `unknown`. On confirmed success, atomically mark the dispatch delivered and write the `delivery.reminder` receipt. Retry once only on a provider rejection known to precede acceptance; record an ambiguous outcome as `unknown`.
```
{% endif %}

A manually started run prepares the window and delivers it directly. The planner delivers directly only for missed prior morning coverage, failed protection, or a meeting already inside its reminder window — a protected target owns its delivery. Claim `dispatches["manual:<run ID>"]` before any direct send.
