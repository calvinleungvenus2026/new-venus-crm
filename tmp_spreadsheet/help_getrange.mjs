import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const input = await FileBlob.load('/Users/clavinleung/Desktop/venus-crm/outputs/mock-crm-framework/VenusLondonTechCRMdata.xlsx');
const workbook = await SpreadsheetFile.importXlsx(input);
console.log(await workbook.help('worksheet.getRange'));
