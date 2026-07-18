Prepare every eligible meeting in the configured window so the requester knows why it matters now, what changed, and what to decide, ask, or do. Honest, actionable preparation beats background.

## Meetings

Scan every calendar the requester can read on @{{providers.calendar}}, including each occurrence of recurring meetings, from now through the next 26 hours; if the scan cannot cover everything, record it as incomplete. Skip what needs no preparation: cancelled or declined events, all-day items, focus time, solo holds, meetings already under way, and anything marked private or confidential.

Confidential professional meetings — board and investor meetings, commercial negotiations, recruiting interviews, customer escalations — are in scope; keep what is stored presentable. Out of scope: personal or acutely sensitive matters where a shareable briefing is inappropriate — medical or therapy appointments, personal legal or financial matters, credentials or secrets, and disciplinary, termination, harassment, or formal investigation meetings. Remove a stored meeting that turns out to be one of these.

{% if options.meetings == "external" %}Keep every otherwise eligible meeting with an attendee outside the requester's organization.{% elsif options.meetings == "internal" %}Keep internal meetings where preparation could affect a decision, risk, commitment, or useful question.{% else %}Keep every eligible external meeting and internal meeting where preparation could affect a decision, risk, commitment, or useful question.{% endif %}

## State

Track each meeting under its event's `entityKey`, keeping the identifiers needed to re-read the event and only presentable, source-cited facts about it — including the handful of attendees who matter. The event's `contentHash` tells you when it changed: preparation for an outdated hash is stale. Cover up to 60 meetings, preferring upcoming ones, and state the gap if more qualify; when space runs short, trim detail, never coverage.

Before cancelling a stored meeting that stopped appearing in a scan, confirm directly with the provider; a failed read is a gap, not a cancellation.

## Research

Deep-research up to 20 highest-impact meetings, ranked by expected effect on the meeting, not ease of research; every other eligible meeting still gets a sparse or partial briefing from verified event context and explicit gaps. Never omit one because research is thin or a child failed. With morning delivery off, leave future meetings to their reminders.

Research directly for a single meeting or an imminent deadline: search @{{providers.email}}, opening only useful full messages. Otherwise delegate with #start_agent, one child per meeting, granting only email reading and web access; give each child its event's details and `contentHash`, and ask for findings that separate fact, inference, and recommendation, with sources and open gaps. Children write no artifact state. Call #wait_for_agents once for all children; accept a result only if its meeting is unchanged, and count a failed, timed-out, or mismatched child as an explicit gap.

Only this run writes meeting state: fill the briefing fields the evidence supports and set an honest status. At least one item must change what the requester should decide, ask, say, notice, or do.

## Delivery

The scheduled planner protects configured delivery targets before calendar discovery or research; a target automation may create only its keyed retry or a moved-event replacement. Create each with personal scope, this artifact, a key containing the parent automation ID, and only the tools it needs. Retry a confirmed #add_automation failure once; if protection still fails, deliver directly after preparation rather than losing the window.

{% if options.morning %}The morning target is {{options.morningTime}}, exactly 30 minutes after the planner trigger. Its window starts strictly after that target and ends at the next local day's target, inclusive; compute each UTC boundary from its local date. A still-upcoming meeting at or before today's target belongs to the prior window—prepare and deliver it directly if undelivered.

When today's target is future, create or find one automation keyed `meeting-briefing:<parent automation ID>:morning:<target UTC>`. It owns delivery. Give it these complete instructions with literal target, window, and planner-trigger UTC values:

```txt
Deliver one Morning Briefing for meetings starting after <coverage start UTC> and at or before <coverage end UTC>.

Read the `briefings` state and re-read each candidate event from @{{providers.calendar}} by its stored identifiers. Refresh stored facts; preparation is stale when an event's `contentHash` changed. Leave out cancelled, private, sensitive, underway, changed, or already-delivered meetings.

If the stored scan predates <planner trigger UTC>, does not cover this window, or any candidate is still unprepared, create one retry for ten minutes from now — no later than 20 minutes after the target — keyed `meeting-briefing:<parent automation ID>:morning-retry:<target UTC>` with these same instructions, and exit once it exists. If the retry cannot be created, or this run is the retry or past the cutoff, continue with what is verified and note the missing coverage once.

Include every verified meeting chronologically; each needs at least one point that changes what the requester will decide, ask, say, or do — calendar facts alone are not a briefing. Sum up any coverage gaps in one line. Create one 36-hour #share_artifact link, keep its `#share=` fragment, and append `&m=<URL-encoded meeting key>` for deep links. {{delivery}}

Before the send, claim the key `morning:<parent automation ID>:<target UTC>` in `dispatches` with #update_artifact_state — one key whether this becomes the digest or a failure notice; mark an abandoned claim `unknown`. Once the provider confirms success, mark the dispatch delivered and record a morning receipt on every included meeting; never record a receipt without confirmed success. Retry only a rejection that clearly preceded acceptance.
```
{% endif %}

{% if options.beforeMeeting %}For every eligible meeting, create a one-time reminder at start minus {{options.leadMinutes}} minutes when future, keyed `meeting-briefing:<parent automation ID>:event:<meeting key>:<start UTC>`. If already inside that window, prepare and deliver it now. Give each automation these complete instructions with literal IDs and times:

```txt
Prepare and, when useful, deliver the assigned meeting: key <meeting key>, calendar <calendar ID or default>, event <event ID>, expected start <start UTC>, parent <parent automation ID>.

Read the `briefings` state and the full event from @{{providers.calendar}}; refresh stored facts, and preparation is stale when the event's `contentHash` changed. A failed read preserves prior work. Remove a private or sensitive event; cancel only what the provider confirms is cancelled or unattended. If the meeting moved to a future time, create one replacement keyed `meeting-briefing:<parent automation ID>:event:<meeting key>:<new start UTC>` with these refreshed instructions. Do not deliver a meeting that is under way, stale, changed, or already delivered.

Search @{{providers.email}} and the public web for what changes the requester's approach; stop when more searching is unlikely to change the briefing. Write only this meeting, with source-cited findings that separate fact, inference, and recommendation, and an honest status. Create a 36-hour #share_artifact deep link. {{delivery}}

Before the send, claim the key `reminder:<parent automation ID>:<meeting key>:<start UTC>:<revision>` in `dispatches` with #update_artifact_state; mark an abandoned claim `unknown`. Once the provider confirms success, mark the dispatch delivered and record the reminder receipt; retry only a rejection that clearly preceded acceptance.
```
{% endif %}

A manually started run prepares the window and delivers it directly. The planner delivers directly only for missed prior morning coverage, failed protection, or a meeting already inside its reminder window — a protected target owns its delivery. Claim the key `manual:<run ID>` in `dispatches` before any direct send.
