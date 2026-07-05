declare module "emoji-datasource" {
  type EmojiDatasourceRecord = {
    short_names: string[]
    unified: string
  }

  const emojiData: EmojiDatasourceRecord[]
  export default emojiData
}
