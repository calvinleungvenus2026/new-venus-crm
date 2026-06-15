import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const filePath = '/Users/clavinleung/Desktop/venus-crm/outputs/mock-crm-framework/VenusLondonTechCRMdata.xlsx';
const headers = [['客户公司','QUO 编号','QUO 状态','MSA 编号','MSA 状态','日期','金额 (GBP)','关联发票','服务内容','one-off/ Phase-based','开始日期','交付日期','完成状态','Phase 1 完成状态','phase 2 完成状态','Phase 3 完成状态','跟进人（msa签署人）']];
const rows = [
  ['Book Keeping Man Limited','QUO-VLT-BKM-2025-1120','unsigned','MSA-VLT-BKM-2026-0325','signed','','','','','one-off','','','','','','',''],
  ['Book Keeping Man Limited','QUO-VLT-BKM-2026-0325','signed','MSA-VLT-BKM-2026-0325','signed','','','','','one-off','','','','','','',''],
  ['Book Keeping Man Limited','QUO-VLT-BKM-20260506','signed','MSA-VLT-BKM-2026-0325','signed','2026-05-06',28999,'','Retail Sales and Inventory Management System','phase-based','','','','','','',''],
  ['CALO DE CONSULTING SERVICES PTE LIMITED','QUO-VLT-CDCS-2025-1110','unsigned','MSA-VLT-CDCS-2025-1120','','2025-11-10',4500,'','CRM System Development','phase-based','','','','','','',''],
  ['DP Consulting Limited','QUO-VLT-DPC-2026-0316','signed','MSA-VLT-DPC-2026-0318','signed','2026-03-16',74900,'','Venus Business Hub Platform – Full Build','phase-based','','','','','','',''],
  ['EVICITY ELECTRICAL LTD','QUO-VLT-EE-2026-0217','unsigned','MSA-VLT-EE-2026-0217','signed','2026-02-17',18899,'','Venus Business Hub Platform – Full Build','phase-based','','','','','','',''],
  ['FOODSNOMILES LIMITED','QUO-VLT-FNM-2025-1125','unsigned','MSA-VLT-FNM-2025-1205','','2025-11-25',50000,'','INNwowo J7 Ordering & Delivery System – Development & Support','phase-based','','','','','','',''],
  ['Fu Cheung Equipment Limited','VLT-FC-QUO-20260104','signed','VLT-FC-MSA-20260501','signed','2026-01-04',69900,'','Integrated AI System & Operational Automation Platform','phase-based','','','','','','',''],
  ['J7Pro Limited','QUO-VLT-J7PRO-20260505','signed','MSA-VLT-J7PRO-20260508','signed','2026-05-05',12000,'','CRM, HR and Finance System Development','phase-based','','','','','','',''],
  ['Last Mile Delivery Limited','QUO-VLT-LMSD-2025-1105','unsigned','VLT-LMD-MSA-20251230','signed','','','','','one-off','','','','','','',''],
  ['Last Mile Delivery Limited','VLT-LMD-QUO-20251220','signed','VLT-LMD-MSA-20251230','signed','2025-12-20',27800,'','System Enhancement with AI & Auto Reply Function','one-off','','','','','','',''],
  ['LUMORASHOP LTD','QUO-VLT-LUM-20260501','signed','MSA-VLT-LUM-20260506','signed','2026-05-01',36000,'','Monthly System Development, Upgrade and Maintenance','phase-based','','','','','','',''],
  ['LUMORASHOP LTD','VLT-LUM-QUO-20260421','signed','MSA-VLT-LUM-20260506','signed','2026-04-21',6980,'','Enterprise digital products','phase-based','','','','','','',''],
  ['Sevene Group Limited','QUO-VLT-SGRP-2025-1120','unsigned','MSA-VLT-SGRP-2025-1130','','2025-11-20',5520,'','Software Development Services','phase-based','','','','','','',''],
  ['TZWOWO LTD','QUO-VLT-TZW-2026-0325','signed','MSA-VLT-TZW-2026-0325','signed','2026-03-25',6680,'','Workflow Automation','phase-based','','','','','','',''],
  ['Xianyi Limited','QUO-VLT-XYI-2025-1210','signed','MSA-VLT-XYL-2026-0330','signed','2025-12-10',700,'','Xianyi EPOS System Update','phase-based','','','','','','',''],
  ['Xianyi Limited','QUO-VLT-XYL-2026-0323','signed','MSA-VLT-XYL-2026-0330','signed','2026-03-20',558,'','OpenClaw Installation & Setup','one-off','','','','','','',''],
  ['Zentrixmarket Ltd','QUO-VLT-ZMX-20260513','signed','VLT-ZM-MSA-20260526','signed','2026-05-13',2000,'','Workflow Setup','phase-based','','','','','','','']
];
const input = await FileBlob.load(filePath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem('Sheet1');
sheet.getRange('A1:Q1').values = headers;
sheet.getRange('A2:Q19').values = rows;
sheet.getRange('A20:Q200').values = Array.from({ length: 181 }, () => Array.from({ length: 17 }, () => ''));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(filePath);
const check = await workbook.inspect({ kind: 'table', range: 'Sheet1!A1:J19', include: 'values', tableMaxRows: 19, tableMaxCols: 10 });
console.log(check.ndjson);
