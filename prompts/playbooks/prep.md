{% if options.mode == "digest" %}Prepare the day's meeting dossiers and schedule the digest that delivers them.{% else %}Plan today's meeting prep, and schedule a focused prep run before each meeting that deserves one.{% endif %}

## The dossier artifact

Find my personal artifact titled "Meeting prep" with search_artifacts. If it does not exist, load the artifact-creator skill and build it before anything else, with personal access and one contract state entry:

- name "dossiers", key "prep/dossiers", scope shared, holding { "schemaVersion": 1, "days": { ... } } where "days" maps a date ("YYYY-MM-DD") to that day's dossiers, and each day maps a calendar event id to one dossier: { "title", "startsAt", "attendees": [{ "name", "email", "company", "notes" }], "context", "prepare": [strings], "threads": [{ "subject", "takeaway" }] }. Keep the schema permissive about optional dossier fields.
- The page renders entirely from that state and calls no tools: a day switcher over "days" defaulting to today, meetings ordered by start time with the next upcoming one focused, and a quiet empty state for days without dossiers.

## Reset

Read the "dossiers" state. With one merge patch, drop day keys older than 7 days and make sure today's key exists.

## Choose the meetings

Check my {{providers.calendar}} for events with other attendees{% if options.mode == "digest" %} starting between now and this time tomorrow{% else %} today{% endif %}. Skip focus blocks, all-day events, and holds without participants. {% if options.meetings == "external" %}Only meetings that include people outside my organization qualify. Prep is for the ones where preparation pays off; skip meetings with nothing worth preparing.{% elsif options.meetings == "internal" %}Only meetings where everyone is part of my organization qualify. Prep is for the ones where preparation pays off — reviews, negotiations, decisions — not routine syncs.{% else %}Prep is for meetings where preparation pays off — external or customer meetings, and high-stakes internal ones such as reviews or negotiations. Routine internal syncs do not qualify.{% endif %} If nothing qualifies, finish quietly: schedule nothing and send nothing.
{% if options.mode == "digest" %}

## Research every meeting now

You are running shortly before the digest goes out. Give each qualifying meeting its own research agent with start_agent — at most ten; cover any remainder briefly yourself. Each agent's task, with the angle-bracket parts filled in:

"""
Research the meeting "<title>" at <local time> on <date> (calendar event <event id>) for my meeting-prep dossier. Only read and write the dossier: send nothing, and change nothing else.

Work out who I am meeting and what it is about: research external attendees and their companies on the web, and search my {{providers.email}} for recent threads with the attendees to surface open questions and promised follow-ups.

Write the dossier into artifact <artifact id>, state entry "dossiers", with a merge patch at days -> <YYYY-MM-DD> -> <event id>, matching the contract's dossier shape.
"""

## Schedule the digest delivery

Create a one-time automation with add_automation: type "once" at {{options.time}} today as a UTC ISO timestamp, name "Meeting digest", artifactId set to the dossier artifact, scope "personal", access with the sending tool the skeleton's last paragraph needs (check list_capabilities), and these instructions with the angle-bracket parts filled in:

"""
Send my meeting digest (artifact <artifact id>).

Read the artifact's "dossiers" state for <YYYY-MM-DD>. Compose the digest from it: one short section per meeting in start order — when, who, and what to have ready.

Create a share link for the artifact with share_artifact, valid for 24 hours: that link is the full prep note.

{{delivery}}
"""
{% if options.reminders != "off" %}

## Schedule a reminder per meeting

For each qualifying meeting whose start is more than {{options.reminders}} minutes away, create a one-time automation with add_automation: type "once" at the meeting's start minus {{options.reminders}} minutes as a UTC ISO timestamp, name "Reminder: " plus the meeting title, artifactId set to the dossier artifact, scope "personal", access with the {{providers.calendar}} and {{providers.email}} read tools from this run's own capabilities plus the sending tool, web true, and these instructions with the angle-bracket parts filled in:

"""
Remind me about the meeting "<title>" at <local time> today (calendar event <event id>, artifact <artifact id>).

Re-read the event on my {{providers.calendar}} first. If it was cancelled or I was removed, stop without sending anything. If it moved, continue with the new time in mind.

Check my {{providers.email}} for anything new from the attendees since the dossier was written; fold anything relevant into the dossier with a merge patch at days -> <YYYY-MM-DD> -> <event id>.

Create a share link for the artifact with share_artifact, valid for 24 hours: that link is the full prep note.

{{delivery}}
"""
{% endif %}
{% else %}

## Schedule one prep run per meeting

For each qualifying meeting whose start is more than {{options.sendBefore}} minutes away, create a one-time automation with add_automation:

- type "once", trigger at the meeting's start minus {{options.sendBefore}} minutes as a UTC ISO timestamp, name "Prep: " plus the meeting title.
- artifactId set to the dossier artifact, scope "personal".
- access: the {{providers.calendar}} and {{providers.email}} read and search tools from this run's own capabilities, the sending tool the skeleton's last paragraph needs, and web true.
- instructions: this skeleton with every angle-bracket part filled in:

"""
Prepare me for the meeting "<title>" at <local time> today (calendar event <event id>, artifact <artifact id>).

Re-read the event on my {{providers.calendar}} first. If it was cancelled or I was removed, stop without sending anything. If it moved to later today, create a replacement automation like this one at the new start minus {{options.sendBefore}} minutes, then stop. If it moved earlier or already started, continue now.

Work out who I am meeting and what it is about: research external attendees and their companies on the web, and search my {{providers.email}} for recent threads with the attendees to surface open questions and promised follow-ups.

Write the dossier into the artifact's "dossiers" state with a merge patch at days -> <YYYY-MM-DD> -> <event id>, matching the contract's dossier shape.

Create a share link for the artifact with share_artifact, valid for 24 hours: that link is the full prep note.

{{delivery}}
"""

## Meetings too close to schedule

For qualifying meetings starting within {{options.sendBefore}} minutes, or already under way, do the prep yourself now, following the skeleton from the re-read step onward.
{% endif %}
