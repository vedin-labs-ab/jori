import { type z } from "zod"
import { toJsonObjectSchema } from "../contract"
import { type MiloToolOptions } from "../types"
import {
  type MiloPromptInput,
  type MiloPromptResult,
  type RawPromptInput,
  type RawPromptResult,
} from "./types"

type RawPromptCaller = <T = unknown>(
  input: RawPromptInput,
  options?: MiloToolOptions
) => Promise<T>

export async function promptModel<TSchema extends z.ZodType>(
  prompt: RawPromptCaller,
  input: MiloPromptInput<TSchema>,
  options?: MiloToolOptions
): Promise<MiloPromptResult<z.output<TSchema>>> {
  const result = await prompt<RawPromptResult>(
    {
      instruction: input.instruction,
      input: input.input,
      outputSchema: toJsonObjectSchema(input.schema),
      outputSchemaDescription: input.schemaDescription,
      outputSchemaName: input.schemaName,
      maxOutputTokens: input.maxOutputTokens,
    },
    options
  )
  const parsed = input.schema.safeParse(result.output)

  if (!parsed.success) {
    throw new Error(
      `Milo prompt output failed schema validation: ${formatZodError(parsed.error)}`
    )
  }

  return { ...result, output: parsed.data }
}

function formatZodError(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const path = issue.path.length === 0 ? "output" : issue.path.join(".")

      return `${path}: ${issue.message}`
    })
    .join("; ")
}
