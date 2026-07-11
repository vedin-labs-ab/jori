Plan today's meeting prep, and schedule a focused prep run before each meeting that deserves one.

## The dossier artifact

Find my personal artifact titled "Meeting prep" with search_artifacts. If it does not exist, load the artifact-creator skill and build it before anything else, with personal access and one contract state entry:

- name "dossiers", key "prep/dossiers", scope shared, holding { "schemaVersion": 1, "days": { ... } } where "days" maps a date ("YYYY-MM-DD") to that day's dossiers, and each day maps a calendar event id to one dossier: { "title", "startsAt", "attendees": [{ "name", "email", "company", "notes" }], "context", "prepare": [strings], "threads": [{ "subject", "takeaway" }] }. Keep the schema permissive about optional dossier fields.
- The page renders entirely from that state and calls no tools: a day switcher over "days" defaulting to today, meetings ordered by start time with the next upcoming one focused, and a quiet empty state for days without dossiers.

## Reset today

Read the "dossiers" state. With one merge patch, drop day keys older than 7 days and make sure today's key exists.

## Choose the meetings

Check my {{providers.calendar}} for today's events with other attendees. Skip focus blocks, all-day events, and holds without participants. Prep is for meetings where preparation pays off — external or customer meetings, and high-stakes internal ones such as reviews or negotiations. Routine internal syncs do not qualify. If nothing qualifies, finish quietly: schedule nothing and send nothing.

## Schedule one prep run per meeting

For each qualifying meeting starting more than 60 minutes from now, create a one-time automation with add_automation:

- type "once", trigger at the meeting's start minus 45 minutes as a UTC ISO timestamp, name "Prep: " plus the meeting title.
- artifactId set to the dossier artifact, scope "personal".
- access: the {{providers.calendar}} and {{providers.email}} read and search tools from this run's own capabilities, the sending tool the skeleton's last paragraph needs, and web true.
- instructions: this skeleton with every angle-bracket part filled in:

"""
Prepare me for the meeting "<title>" at <local time> today (calendar event <event id>, artifact <artifact id>).

Re-read the event on my {{providers.calendar}} first. If it was cancelled or I was removed, stop without sending anything. If it moved to later today, create a replacement automation like this one at the new start minus 45 minutes, then stop. If it moved earlier or already started, continue now.

Work out who I am meeting and what it is about: research external attendees and their companies on the web, and search my {{providers.email}} for recent threads with the attendees to surface open questions and promised follow-ups.

Write the dossier into the artifact's "dossiers" state with a merge patch at days -> <YYYY-MM-DD> -> <event id>, matching the contract's dossier shape.

Create a share link for the artifact with share_artifact, valid for 24 hours: that link is the full prep note.

{{delivery}}
"""

## Meetings too close to schedule

For qualifying meetings starting within 60 minutes, or already under way, do the prep yourself now, following the skeleton from the re-read step onward.
