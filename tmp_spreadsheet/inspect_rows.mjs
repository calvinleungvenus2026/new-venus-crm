import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const input = await FileBlob.load('/Users/clavinleung/Desktop/venus-crm/outputs/mock-crm-framework/VenusLondonTechCRMdata.xlsx');
const workbook = await SpreadsheetFile.importXlsx(input);
const table = await workbook.inspect({ kind: 'table', range: 'Sheet1!A1:Z20', include: 'values', tableMaxRows: 20, tableMaxCols: 26 });
console.log(table.ndjson);
