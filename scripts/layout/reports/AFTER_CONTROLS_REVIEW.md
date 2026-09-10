# Independent shell verification

One bounded pass, six exact inventory IDs, cold375 and warm1440, twelve captures. No retries or new fixes.

All12 captures and70 PNGs were reviewed. Browser is closed. The targeted corrections improve in these profiles; the Personal integration headline remains a confirmed residual. Overall native totals are not treated as pass/fail because the report retains existing range-width motion, identical-box text replacement and requested navigation.

| Scenario | Profile | Result | Evidence |
| --- | --- | --- | --- |
| C156-personal | cold-375 | residual-confirmed | [6 reviewed frames](dist/layout-hunt/after/shell-controls/C156-personal/cold-375/record.json) |
| C156-personal | warm-1440 | not-reproduced-at-this-profile | [6 reviewed frames](dist/layout-hunt/after/shell-controls/C156-personal/warm-1440/record.json) |
| C156-return | cold-375 | targeted-cause-stable | [6 reviewed frames](dist/layout-hunt/after/shell-controls/C156-return/cold-375/record.json) |
| C156-return | warm-1440 | targeted-cause-stable | [6 reviewed frames](dist/layout-hunt/after/shell-controls/C156-return/warm-1440/record.json) |
| shell-auth-google-pending | cold-375 | targeted-cause-stable | [6 reviewed frames](dist/layout-hunt/after/shell-controls/shell-auth-google-pending/cold-375/record.json) |
| shell-auth-google-pending | warm-1440 | targeted-cause-stable | [6 reviewed frames](dist/layout-hunt/after/shell-controls/shell-auth-google-pending/warm-1440/record.json) |
| shell-live-usage-30-to-7 | cold-375 | targeted-cause-stable-with-existing-motion | [6 reviewed frames](dist/layout-hunt/after/shell-controls/shell-live-usage-30-to-7/cold-375/record.json) |
| shell-live-usage-30-to-7 | warm-1440 | targeted-cause-stable-with-existing-motion | [6 reviewed frames](dist/layout-hunt/after/shell-controls/shell-live-usage-30-to-7/warm-1440/record.json) |
| shell-route-home-enter | cold-375 | targeted-cause-stable | [5 reviewed frames](dist/layout-hunt/after/shell-controls/shell-route-home-enter/cold-375/record.json) |
| shell-route-home-enter | warm-1440 | targeted-cause-stable | [5 reviewed frames](dist/layout-hunt/after/shell-controls/shell-route-home-enter/warm-1440/record.json) |
| shell-waitlist-email-error | cold-375 | targeted-cause-stable | [6 reviewed frames](dist/layout-hunt/after/shell-controls/shell-waitlist-email-error/cold-375/record.json) |
| shell-waitlist-email-error | warm-1440 | targeted-cause-stable | [6 reviewed frames](dist/layout-hunt/after/shell-controls/shell-waitlist-email-error/warm-1440/record.json) |

## C156-personal

- cold-375: Cold mobile Google Calendar card288 to272px; Outlook y632 to616px, height272 to256px. Native event782ms, value0.0053415516, recentInputfalse. PNG587ms checking to1062ms loaded visibly brackets it. Original variable loading headline remains intentionally unchanged by the partial fix. No new fix loop.
- warm-1440: Desktop card geometry stays136px after the Personal page arrives; pending headline is not captured. Original variable loading headline remains intentionally unchanged by the partial fix. No new fix loop.

## C156-return

- cold-375: Organization install-label changes keep card and action width fixed. Slack card188px mobile and136px desktop through Checking to Access expired. Native text replacement reports equal from/to rectangles. Tab navigation replaces the requested page. This verifies action-label sizing, not every connected/disconnected provider variant.
- warm-1440: Organization install-label changes keep card and action width fixed. Slack card188px mobile and136px desktop through Checking to Access expired. Native text replacement reports equal from/to rectangles. Tab navigation replaces the requested page. This verifies action-label sizing, not every connected/disconnected provider variant.

## shell-auth-google-pending

- cold-375: Google SVG/spinner share14px layout slot; text and button keep position. Native0, no scroll. Settled frame has the original sign-in button and fixed-position rejection toast. The spinner rotation changes its transformed bounding box as intended. Exact POST /api/auth/sign-in/social was fulfilled400 by the recorded CDP fixture; no external OAuth navigation.
- warm-1440: Google SVG/spinner share14px layout slot; text and button keep position. Native0, no scroll. Settled frame has the original sign-in button and fixed-position rejection toast. The spinner rotation changes its transformed bounding box as intended. Exact POST /api/auth/sign-in/social was fulfilled400 by the recorded CDP fixture; no external OAuth navigation.

## shell-live-usage-30-to-7

- cold-375: All four stat slots retain83px height through pending and resolved values; the comparison rows no longer collapse. No scroll delta. Existing range control width129.13 to120.09px remains a native entry. Query body still replaces charts/lists with loading and then animates bars; this is outside the comparison-slot fix.
- warm-1440: All four stat slots retain83px height through pending and resolved values; the comparison rows no longer collapse. No scroll delta. Existing range control width129.13 to120.09px remains a native entry. Query body still replaces charts/lists with loading and then animates bars; this is outside the comparison-slot fix.

## shell-route-home-enter

- cold-375: No native entries. Visible hero, CTA and demo rows retain position. Warm desktop has no post-first rect changes. Cold mobile document height changes below the viewport as lazy sections mount, 9374 to11944.5px main height. Content appears within the reserved demo header. This is not a whole-page zero-difference claim.
- warm-1440: No native entries. Visible hero, CTA and demo rows retain position. Warm desktop has no post-first rect changes. This initial entry does not verify execution-clock hydration on other routes.

## shell-waitlist-email-error

- cold-375: Error appears in reserved19.5px line. Existing fields and form keep rectangles, no native entries or scroll changes. Only local email validation is sampled; form-level remote error and clear/retry variants remain unverified.
- warm-1440: Error appears in reserved19.5px line. Existing fields and form keep rectangles, no native entries or scroll changes. Only local email validation is sampled; form-level remote error and clear/retry variants remain unverified.

The full inventory was not rerun, as requested. No additional capture loop was started.
