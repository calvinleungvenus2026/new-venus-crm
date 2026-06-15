import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const input = await FileBlob.load('/Users/clavinleung/Desktop/venus-crm/outputs/mock-crm-framework/VenusLondonTechCRMdata.xlsx');
const workbook = await SpreadsheetFile.importXlsx(input);
const names = workbook.worksheets.items.map(ws => ws.name);
console.log(JSON.stringify({ sheets: names }, null, 2));
