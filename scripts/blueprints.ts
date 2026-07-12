import { compilePlaybookBlueprints } from "./runtime/blueprints.ts"

await compilePlaybookBlueprints(process.argv.includes("--check"))
