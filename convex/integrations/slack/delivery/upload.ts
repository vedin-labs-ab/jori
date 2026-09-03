import { type FileAttachment } from "../../../files/attachments"
import { copyBytesToArrayBuffer } from "../../../shared/encoding"
import { requiredSlackResultString, slackFormApi, slackJsonApi } from "../api"

export async function postSlackFiles(
  token: string,
  args: {
    files: FileAttachment[]
    channel: string
    text: string
    thread_ts?: string
  }
) {
  const uploads = []

  for (const file of args.files) {
    uploads.push(await uploadSlackFile(token, file))
  }

  return await slackJsonApi(token, "files.completeUploadExternal", {
    ...slackFileTarget(args.channel),
    files: uploads,
    initial_comment: args.text,
    thread_ts: args.thread_ts,
  })
}

function slackFileTarget(target: string) {
  return /^[UW]/.test(target) ? { channels: target } : { channel_id: target }
}

async function uploadSlackFile(token: string, file: FileAttachment) {
  const ticket = await slackFormApi(token, "files.getUploadURLExternal", {
    filename: file.name,
    length: file.bytes.byteLength,
  })
  const uploadUrl = requiredSlackResultString(ticket, "upload_url")
  const fileId = requiredSlackResultString(ticket, "file_id")
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "content-type": file.mimeType,
    },
    body: new Blob([copyBytesToArrayBuffer(file.bytes)], {
      type: file.mimeType,
    }),
  })

  if (!response.ok) {
    throw new Error(`Slack file upload failed: ${await response.text()}`)
  }

  return {
    id: fileId,
    title: file.name,
  }
}
