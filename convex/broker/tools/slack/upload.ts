import { type FileAttachment } from "../../../files/attachments"
import { requiredSlackResultString, slackFormApi, slackJsonApi } from "./client"

export async function postSlackFiles(
  token: string,
  args: {
    attachments: FileAttachment[]
    channel: string
    text: string
    thread_ts?: string
  }
) {
  const files = []

  for (const attachment of args.attachments) {
    files.push(await uploadSlackFile(token, attachment))
  }

  return await slackJsonApi(token, "files.completeUploadExternal", {
    channel_id: args.channel,
    files,
    initial_comment: args.text,
    thread_ts: args.thread_ts,
  })
}

async function uploadSlackFile(token: string, attachment: FileAttachment) {
  const ticket = await slackFormApi(token, "files.getUploadURLExternal", {
    filename: attachment.name,
    length: attachment.bytes.byteLength,
    ...(attachment.description === undefined ||
    !attachment.mimeType.startsWith("image/")
      ? {}
      : { alt_txt: attachment.description.slice(0, 1000) }),
  })
  const uploadUrl = requiredSlackResultString(ticket, "upload_url")
  const fileId = requiredSlackResultString(ticket, "file_id")
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "content-type": attachment.mimeType,
    },
    body: new Blob([copyBytesToArrayBuffer(attachment.bytes)], {
      type: attachment.mimeType,
    }),
  })

  if (!response.ok) {
    throw new Error(`Slack file upload failed: ${await response.text()}`)
  }

  return {
    id: fileId,
    title: attachment.name,
  }
}

function copyBytesToArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength)

  new Uint8Array(buffer).set(bytes)

  return buffer
}
