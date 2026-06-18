import {
  slackBotScopes,
  slackUserScopes,
} from "../../../../providers/slack/config"
import { runtimeAssets } from "../../../../runtime/_generated/assets"
import { createNodeScriptCommand } from "./script"

export const slackTokenPreflightCommand = createNodeScriptCommand({
  configEnv: "MILO_SLACK_PREFLIGHT_CONFIG_BASE64",
  config: {
    botScopes: slackBotScopes,
    userScopes: slackUserScopes,
  },
  script: runtimeAssets.sandbox.slackPreflight,
  target: "/tmp/milo-slack-preflight.ts",
})
