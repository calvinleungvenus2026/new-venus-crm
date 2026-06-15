import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "/Users/clavinleung/Downloads/crm framework.xlsx";

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = [];
for (const sheet of workbook.worksheets.items) {
  const name = sheet.name;
  const inspect = await workbook.inspect({
    kind: "table",
    range: `${name}!A1:Z20`,
    include: "values,formulas",
    tableMaxRows: 20,
    tableMaxCols: 26,
  });
  summary.push({ name, ndjson: inspect.ndjson });
}

const outputPath = path.join(
  "/Users/clavinleung/Desktop/venus-crm/.codex-spreadsheet-work",
  "inspect-summary.json"
);
await fs.writeFile(outputPath, JSON.stringify(summary, null, 2), "utf8");
console.log(outputPath);
