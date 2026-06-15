import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "/Users/clavinleung/Downloads/crm framework.xlsx";
const outputDir = "/Users/clavinleung/Desktop/venus-crm/outputs/mock-crm-framework";
const outputPath = `${outputDir}/crm framework - 50 mock rows.xlsx`;
const previewPath = `${outputDir}/crm-framework-preview.png`;
const inspectPath = `${outputDir}/inspect-after.json`;

const rows = [];

const internalCompanies = [
  "Venus CRM",
  "Trinity Property",
  "Trinity Concierge",
  "Banyan Services",
  "Calvin Digital",
];

const customerCompanies = [
  "Northstar Retail Ltd",
  "BluePeak Logistics",
  "Maple & Co Holdings",
  "Harbour View Estates",
  "Redline Commerce",
  "Oakstone Advisory",
  "Silverline Foods",
  "Pioneer MedTech",
  "Summit Learning Group",
  "Crescent Travel Labs",
];

const quoStatuses = ["signed", "unsigned"];
const msaStatuses = ["signed", "unsigned"];
const oneOffServices = [
  "CRM data cleanup",
  "Lead import and mapping",
  "Sales pipeline audit",
  "Invoice workflow setup",
  "Dashboard refresh",
  "Contact deduplication",
  "Quarterly reporting setup",
  "Support handover pack",
];
const phaseServices = [
  "CRM implementation rollout",
  "Multi-team onboarding program",
  "Sales process redesign",
  "Cross-company migration project",
  "Customer success workflow rollout",
  "End-to-end CRM transformation",
  "Reporting and automation deployment",
  "Regional operations launch",
];
const owners = [
  "Calvin Leung",
  "Annie Wong",
  "Brian Chan",
  "Chloe Ng",
  "Derek Lam",
  "Emily Ho",
  "Felix Yip",
  "Grace Liu",
  "Henry Tse",
  "Ivy Cheung",
];

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildPhaseStatuses(index) {
  const patterns = [
    ["Completed", "Completed", "Completed"],
    ["Completed", "In Progress", "Not Started"],
    ["In Progress", "Not Started", "Not Started"],
    ["Completed", "Completed", "In Progress"],
    ["Not Started", "Not Started", "Not Started"],
  ];
  return patterns[index % patterns.length];
}

for (let i = 0; i < 50; i += 1) {
  const company = internalCompanies[i % internalCompanies.length];
  const customerCompany = customerCompanies[i % customerCompanies.length];
  const quoNo = `QUO-2026-${String(i + 1).padStart(3, "0")}`;
  const msaNo = `MSA-2026-${String(i + 1).padStart(3, "0")}`;
  const projectDate = new Date(Date.UTC(2026, 0, 5 + i * 2));
  const amount = 2500 + i * 185;
  const invoiceNo = i % 4 === 0 ? "" : `INV-2026-${String(300 + i).padStart(4, "0")}`;
  const owner = owners[i % owners.length];
  const projectType = i % 2 === 0 ? "one-off" : "phase-based";

  let startDate = "";
  let deliveryDate = "";
  let completionStatus = "";
  let phase1Status = "";
  let phase2Status = "";
  let phase3Status = "";
  let service = "";

  if (projectType === "one-off") {
    const start = new Date(Date.UTC(2026, 0, 8 + i * 2));
    const delivery = addDays(start, 7 + (i % 5) * 3);
    startDate = isoDate(start);
    deliveryDate = isoDate(delivery);
    completionStatus = ["Completed", "In Progress", "Pending"][i % 3];
    service = oneOffServices[i % oneOffServices.length];
  } else {
    [phase1Status, phase2Status, phase3Status] = buildPhaseStatuses(i);
    service = phaseServices[i % phaseServices.length];
  }

  rows.push([
    company,
    customerCompany,
    quoNo,
    quoStatuses[i % quoStatuses.length],
    msaNo,
    msaStatuses[i % msaStatuses.length],
    isoDate(projectDate),
    amount,
    invoiceNo,
    service,
    projectType,
    startDate,
    deliveryDate,
    completionStatus,
    phase1Status,
    phase2Status,
    phase3Status,
    owner,
  ]);
}

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.items[0];

sheet.getRange("A6:R55").values = rows;
sheet.getRange("G6:G55").format.numberFormat = "yyyy-mm-dd";
sheet.getRange("H6:H55").format.numberFormat = "#,##0";
sheet.getRange("L6:M55").format.numberFormat = "yyyy-mm-dd";
sheet.getRange("A:A").format.columnWidthPx = 110;
sheet.getRange("B:B").format.columnWidthPx = 150;
sheet.getRange("C:F").format.columnWidthPx = 120;
sheet.getRange("G:G").format.columnWidthPx = 105;
sheet.getRange("H:H").format.columnWidthPx = 95;
sheet.getRange("I:I").format.columnWidthPx = 115;
sheet.getRange("J:J").format.columnWidthPx = 180;
sheet.getRange("K:K").format.columnWidthPx = 190;
sheet.getRange("L:N").format.columnWidthPx = 105;
sheet.getRange("O:Q").format.columnWidthPx = 110;
sheet.getRange("R:R").format.columnWidthPx = 135;

await fs.mkdir(outputDir, { recursive: true });

const inspect = await workbook.inspect({
  kind: "table",
  range: "Sheet1!A1:R20",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 18,
});
await fs.writeFile(inspectPath, inspect.ndjson, "utf8");

const preview = await workbook.render({
  sheetName: sheet.name,
  range: "A1:R20",
  scale: 1,
  format: "png",
});
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);

console.log(outputPath);
