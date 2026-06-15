import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const filePath = '/Users/clavinleung/Desktop/venus-crm/outputs/mock-crm-framework/VenusLondonTechCRMdata.xlsx';
const msaMap = new Map([
  ['Book Keeping Man Limited', ['MSA-VLT-BKM-2026-0325', 'signed']],
  ['CALO DE CONSULTING SERVICES PTE LIMITED', ['MSA-VLT-CDCS-2025-1120', '']],
  ['DP Consulting Limited', ['MSA-VLT-DPC-2026-0318', 'signed']],
  ['EVICITY ELECTRICAL LTD', ['MSA-VLT-EE-2026-0217', 'signed']],
  ['FOODSNOMILES LIMITED', ['MSA-VLT-FNM-2025-1205', '']],
  ['Fu Cheung Equipment Limited', ['VLT-FC-MSA-20260501', 'signed']],
  ['J7Pro Limited', ['MSA-VLT-J7PRO-20260508', 'signed']],
  ['Last Mile Delivery Limited', ['VLT-LMD-MSA-20251230', 'signed']],
  ['LUMORASHOP LTD', ['MSA-VLT-LUM-20260506', 'signed']],
  ['Sevene Group Limited', ['MSA-VLT-SGRP-2025-1130', '']],
  ['TZWOWO LTD', ['MSA-VLT-TZW-2026-0325', 'signed']],
  ['Xianyi Limited', ['MSA-VLT-XYL-2026-0330', 'signed']],
  ['Zentrixmarket Ltd', ['VLT-ZM-MSA-20260526', 'signed']]
]);
const input = await FileBlob.load(filePath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem('Sheet1');
const inspected = await workbook.inspect({ kind: 'table', range: 'Sheet1!A1:Q40', include: 'values', tableMaxRows: 40, tableMaxCols: 17 });
const table = JSON.parse(inspected.ndjson);
const values = table.values;
for (let i = 1; i < values.length; i++) {
  const company = values[i][0];
  if (!company) continue;
  const msa = msaMap.get(company);
  if (!msa) continue;
  values[i][3] = msa[0];
  values[i][4] = msa[1];
}
sheet.getRange('A1:Q40').values = values.map(row => Array.from({ length: 17 }, (_, idx) => row[idx] ?? ''));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(filePath);
const check = await workbook.inspect({ kind: 'table', range: 'Sheet1!A1:E15', include: 'values', tableMaxRows: 15, tableMaxCols: 5 });
console.log(check.ndjson);
