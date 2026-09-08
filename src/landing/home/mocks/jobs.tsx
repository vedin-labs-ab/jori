import { ClientOnly } from "@tanstack/react-router"
import { lazy, Suspense, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FolderPickerField } from "@/shared/console/folders/field"
import { jobPolicyKey } from "@/shared/console/jobs/access/policy"
import { jobFormValues } from "@/shared/console/jobs/editor/save"
import { type JobFormValues } from "@/shared/console/jobs/types"
import { DialogForm } from "@/shared/console/materials/form"
import { DemoEventFields } from "../../demo/dialogs/editor"
import { DemoAudience } from "../../demo/dialogs/visibility"
import { jobId } from "../../demo/fixtures/jobs"
import { grantOptions } from "../../demo/fixtures/people"
import { demoPermissions, demoSkills } from "../../demo/fixtures/permissions"
import { useDemoFolders, useDemoWorkspace } from "../../demo/workspace"
import { Definition, Section, Sigil } from "../../section"
import { NearViewport } from "../../viewport"

// The editor's fields pull in TipTap, which dwarfs the page, and TipTap
// needs a document, which the server has none of: the fields arrive on
// the client, lazily, into a box the size they will take.
const JobEditorFields = lazy(async () => ({
  default: (await import("@/shared/console/jobs/editor/fields"))
    .JobEditorFields,
}))
const policyKey = jobPolicyKey(demoPermissions)
// The heights are the editor content's own, measured in the browser at
// viewports 360, 390, 430, 640, 768, 1024, 1280 and 1920: 814, 790, 730,
// 626, 706, 626, 610 and 610 pixels. The fields wrap against the editor's
// container rather than the window, so the md grid's narrower column makes
// the box taller again at 768. The placeholder and the editor carry the
// same heights, so the box is the size the fields will take before they
// arrive; re-measure when the fields change.
const editorClassName = cn(
  "min-h-[51rem] min-w-0 rounded-xl border bg-card text-card-foreground",
  "min-[390px]:min-h-[49.5rem] min-[430px]:min-h-[46rem] sm:min-h-[39.5rem]",
  "md:min-h-[44.5rem] lg:min-h-[39.5rem] xl:min-h-[38.5rem]"
)

/** The instructions pillar: the job editor's own fields, in place, over the
 *  brief the hero's thread runs on. */
export function Jobs() {
  return (
    <Section
      lede={
        <>
          Describe the job the way you'd brief a person. Type{" "}
          <Sigil kind="access" /> to give it access, <Sigil kind="skill" /> to
          load a skill, <Sigil kind="tool" /> to name a tool. Pick when it runs:
          a schedule, a date, or an event in Slack, GitHub, Linear, or Notion.
          It runs in the cloud whether or not your laptop is open.
        </>
      }
      title="Jobs are just instructions"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <dl className="space-y-8">
          <Definition term="Plain text, not pipelines">
            No node graphs, nothing to wire. If you can write the brief, you've
            written the job.
          </Definition>
          <Definition term="Only the access you gave it">
            Each job runs with the access it was given and nothing it wasn't.
            Web search is off until you turn it on.
          </Definition>
          <Definition term="Filed like anything else">
            A job lives in a folder. Move it and it answers to the new folder:
            who sees it, and where its runs are counted.
          </Definition>
        </dl>
        <NearViewport className="min-w-0" fallback={<EditorPlaceholder />}>
          <ClientOnly fallback={<EditorPlaceholder />}>
            <Suspense fallback={<EditorPlaceholder />}>
              <ChaseEditor />
            </Suspense>
          </ClientOnly>
        </NearViewport>
      </div>
    </Section>
  )
}

function EditorPlaceholder() {
  return <div aria-hidden className={editorClassName} />
}

/** The editor seeded with the chase job's own brief. Creating files a job
 *  from whatever the form says by then, into the workspace the page shares. */
function ChaseEditor() {
  const { actions, state } = useDemoWorkspace()
  // An existing job's values leave the folder out, since the console moves
  // jobs through the folders instead; the draft here starts where the job is.
  const [values, setValues] = useState<JobFormValues>(() => {
    const chase = state.jobs.find((job) => job.id === jobId("chase"))

    return {
      ...jobFormValues(chase, { webSearch: false }),
      folderId: chase?.folderId ?? null,
    }
  })
  const [error, setError] = useState<string>()
  const folders = useDemoFolders()
  const create = async () => {
    const problem = await actions.saveJob(values)

    if (problem === undefined) {
      toast.success(`Created ${values.name}.`)
    } else {
      setError(problem)
    }
  }

  return (
    <div className={cn(editorClassName, "p-5")}>
      <DialogForm>
        <JobEditorFields
          audience={
            <DemoAudience
              target={{ kind: "draft", folderId: values.folderId }}
              value={values.visibility}
            />
          }
          error={error}
          eventFields={<DemoEventFields />}
          folderField={(field) => (
            <FolderPickerField {...field} folders={folders} />
          )}
          grantOptions={grantOptions}
          onValuesChange={(next) => {
            setError(undefined)
            setValues(next)
          }}
          permissions={demoPermissions}
          policyKey={policyKey}
          showRunPreview
          skills={demoSkills}
          values={values}
        />
        <div className="mt-4 flex justify-end">
          <Button onClick={create} type="button">
            Create job
          </Button>
        </div>
      </DialogForm>
    </div>
  )
}
