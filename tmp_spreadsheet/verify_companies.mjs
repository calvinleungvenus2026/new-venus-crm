import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const filePath = '/Users/clavinleung/Desktop/venus-crm/outputs/mock-crm-framework/VenusLondonTechCRMdata.xlsx';
const input = await FileBlob.load(filePath);
const workbook = await SpreadsheetFile.importXlsx(input);
const check = await workbook.inspect({ kind: 'table', range: 'Sheet1!A1:A20', include: 'values', tableMaxRows: 20, tableMaxCols: 1 });
console.log(check.ndjson);
