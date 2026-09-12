# Workspace exports

[Docs index](index.md) · [Launch policies](legal.md)

Workspace owners can export from General settings. The download includes the
console chats, jobs, folders, tables, stores and files they can already access. Owner
status does not reveal another member's private content. Every page checks live
owner membership and resource visibility.

The NDJSON download has one JSON record per line, with a `section` field and
stable record IDs. Files include their bytes as base64. No integration keys,
share secrets or file download URLs are saved in the export. Browser exports
stop with an explicit error above 50 MB or if a file cannot be downloaded.

## Support exports

For a verified instruction from the customer acting as controller, use the
operator command below. This includes private content and provider conversation
messages, jobs, workspace context, imported events, deductions and execution
records within the named workspace. It writes paginated NDJSON and streams
original file bytes to disk without the browser size limit.

```sh
node --experimental-strip-types scripts/export.ts dev <organizationId> <new-output-directory>
```

Choose `prod-eu` or `prod-us` for a production workspace. The usual target loader
supplies credentials. Never copy keys into arguments. The command reads data;
it does not deploy or delete anything.

Verify the requester and regional workspace first. Stop and settle active work
with the customer, finish the export before deletion starts, and rerun if work
changed during export. This is not an atomic database snapshot. The output
folder must be new and has owner-only filesystem permissions. `manifest.json`
appears only after all records and files are written successfully. Without it,
the export is incomplete and must not be delivered. Files are named by file ID;
their original names and MIME types are in `records.ndjson`.

Deliver through an agreed authenticated channel and delete the local copy after
confirmed receipt. Record the request, scope, recipient and completion without
copying customer content into support logs.

## Scope

The browser export returns visible product content. The operator export also
includes customer-related processing records such as execution traces, model
transcripts and inferred context. It excludes login credentials, sessions and financial audit records. Organization details, member names and emails, teams,
invitations, pending webhook payloads and workspace-scoped email submissions
are included. Unsaved files in ephemeral sandboxes are excluded; save required
outputs as Jori files before exporting. Integration display details are included,
but provider credentials, installation metadata and common secret fields are removed.

Review the operator export before delivery. Free text can contain secrets pasted
by users or returned by tools, and an individual access request can require
redacting other people's information. Billing evidence and provider-held records
may need separate retrieval. Record those decisions and any lawful exclusions;
do not treat the file download alone as completion of every GDPR request.
