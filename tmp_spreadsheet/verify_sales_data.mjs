import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const filePath = '/Users/clavinleung/Desktop/venus-crm/outputs/mock-crm-framework/VenusLondonTechCRMdata.xlsx';
const input = await FileBlob.load(filePath);
const workbook = await SpreadsheetFile.importXlsx(input);
const check = await workbook.inspect({ kind: 'table', range: 'Sheet1!A1:Q16', include: 'values', tableMaxRows: 16, tableMaxCols: 17 });
console.log(check.ndjson);
