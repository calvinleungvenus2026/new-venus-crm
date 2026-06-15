import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outDir = "/Users/clavinleung/Desktop/venus-crm/outputs/mock-crm-framework";
const londonPath = `${outDir}/TrinityLondonCRMdata.xlsx`;
const propertyPath = `${outDir}/TrinityPropertyCRMData.xlsx`;

const headers = [[
  "客户公司",
  "QUO 编号",
  "QUO 状态",
  "MSA 编号",
  "MSA 状态",
  "日期",
  "金额 (GBP)",
  "关联发票",
  "服务内容",
  "one-off/ Phase-based",
  "开始日期",
  "交付日期",
  "完成状态",
  "Phase 1 完成状态",
  "phase 2 完成状态",
  "Phase 3 完成状态",
  "跟进人（msa签署人）",
]];

const londonRowsRaw = [
  `Book Keeping Man Limited,"Football VIP suite, London business tour, car rental and conference support",32172.00,TLC-BKM-QUO-20251223,TLC-BKM-MSA-20260102,32172.00,1,INV-TLC 26007,"£32,172.00",✅ 已闭环,报价 1 份\t合同 1 份\t发票 1 份,TrinityLondonConcierge/02_Sales/Book Keeping Man Limited/TLC-BKM-QUO-20251223-signed.pdf\tTrinityLondonConcierge/03_Contracts/Book Keeping Man Limited/TLC-BKM-MSA-20260102-signed.pdf\tTrinityLondonConcierge/04_Finance/Book Keeping Man Limited/Bookkeeping Man INV-TLC 26007.pdf`,
  `DP Consulting Limited,"Wedding package essential, premium and concierge services for July 2026 weddings",242414.60,TLC-DP-QUO-20251231\tTC-DP-QUO-2026-001\tTLC-DP-QUO-20260120\tTLC-DP-QUO-20260121\tTLC-DP-QUO-20260214\tTLC-DP-QUO-20260228\tTLC-DP-QUO-20260417\tTLC-DP-QUO-20260501,TLC-DP-MSA-20260105\tTC-DP-MSA-2026-001\tTLC-DP-MSA-20260125\tTLC-DP-MSA-20260126\tTLC-DP-MSA-20260224\tTLC-DP-MSA-20260310\tTLC-DP-MSA-20260417\tTLC-DP-MSA-20260506,225417.60,7,INV-TLC 26003\tINV-TLC 26011\tINV-TLC 26016\tINV-TLC 26035\tINV-TLC 26040\tINV-TLC 26047`,
  `Fu Cheung Equipment Limited,Arsenal vs Manchester United VIP suite and executive logistics support,76872.00,TLC-FCE-QUO-20251218\tTLC-FCE-QUO-20251219,TLC-FCE-MSA-20251228\tTLC-FCE-MSA-20251229,76872.00,2,INV-TLC 26006\tINV-TLC 26005,"£42,288.00\t£34,584.00",✅ 已闭环,报价 2 份\t合同 2 份\t发票 2 份,TrinityLondonConcierge/02_Sales/Fu Cheung Equipment Limited/TLC-FCE-QUO-20251218-signed.pdf\tTrinityLondonConcierge/02_Sales/Fu Cheung Equipment Limited/TLC-FCE-QUO-20251219-signed.pdf\tTrinityLondonConcierge/03_Contracts/Fu Cheung Equipment Limited/TLC-FCE-MSA-20251228-signed.pdf\tTrinityLondonConcierge/03_Contracts/Fu Cheung Equipment Limited/TLC-FCE-MSA-20251229-signed.pdf\tTrinityLondonConcierge/04_Finance/Fu Cheung Equipment Limited/Fu Cheung INV-TLC 26006.pdf\tTrinityLondonConcierge/04_Finance/Fu Cheung Equipment Limited/Fu Cheung INV-TLC 26005.pdf`,
  `GLOBAL AMLCTF LIMITED,Market research report engagement for Skyfox Entertainment International Limited,37800.00,TLC-GA-QUO-20260417\tTLC-GAL-QUO-20260425\tTLC-GAL-QUO-20260429\tTLC-GAL-QUO-20260511,TLC-GA-MSA-20260427\tTLC-GAL-MSA-20260429\tTLC-GAL-MSA-20260501\tTLC-GAL-MSA-20260513,21600.00,3,INV-TLC 26046\tINV-TLC 26052\tINV-TLC 26055,"£12,000.00\t£4,800.00\t£4,800.00",✅ 已闭环,报价 4 份\t合同 4 份\t发票 3 份,TrinityLondonConcierge/02_Sales/GLOBAL AMLCTF LIMITED/TLC-GA-QUO-20260417-signed.pdf\tTrinityLondonConcierge/02_Sales/GLOBAL AMLCTF LIMITED/TLC-GAL-QUO-20260425-signed.pdf\tTrinityLondonConcierge/02_Sales/GLOBAL AMLCTF LIMITED/TLC-GAL-QUO-20260429-signed.pdf\tTrinityLondonConcierge/02_Sales/GLOBAL AMLCTF LIMITED/TLC-GAL-QUO-20260511-signed.pdf\tTrinityLondonConcierge/03_Contracts/GLOBAL AMLCTF LIMITED/TLC-GA-MSA-20260427-signed.pdf\tTrinityLondonConcierge/03_Contracts/GLOBAL AMLCTF LIMITED/TLC-GAL-MSA-20260429-signed.pdf\tTrinityLondonConcierge/03_Contracts/GLOBAL AMLCTF LIMITED/TLC-GAL-MSA-20260501-signed.pdf\tTrinityLondonConcierge/03_Contracts/GLOBAL AMLCTF LIMITED/TLC-GAL-MSA-20260513-signed.pdf`,
  `Joy Team (HK) Holdings Limited,UK research tour and executive chauffeur support,58800.00,TLC-JT-QUO-20251227,TLC-JT-MSA-20260106,58800.00,1,INV-TLC 26009,"£58,800.00",✅ 已闭环,报价 1 份\t合同 1 份\t发票 1 份,TrinityLondonConcierge/02_Sales/Joy Team (HK) Holdings Limited/TLC-JT-QUO-20251227-signed.pdf\tTrinityLondonConcierge/03_Contracts/Joy Team (HK) Holdings Limited/TLC-JT-MSA-20260106-signed.pdf\tTrinityLondonConcierge/04_Finance/Joy Team/Joy Team INV-TLC 26009.pdf`,
  `Last Mile Delivery Limited,"Audi A6 rental, chauffeur, translators and UEFA ticket deposit support",36612.00,TLC-LMD-QUO-20251217\tTLC-LMD-QUO-20251231,TLC-LMD-MSA-20251227\tTLC-LMD-MSA-20260110,36612.00,2,INV-TLC 26004\tINV-TLC 26010,"£15,348.00\t£21,264.00",✅ 已闭环,报价 2 份\t合同 2 份\t发票 2 份,TrinityLondonConcierge/02_Sales/Last Mile Delivery Limited/TLC-LMD-QUO-20251217-signed.pdf\tTrinityLondonConcierge/02_Sales/Last Mile Delivery Limited/TLC-LMD-QUO-20251231-signed.pdf\tTrinityLondonConcierge/03_Contracts/Last Mile Delivery Limited/TLC-LMD-MSA-20251227-signed.pdf\tTrinityLondonConcierge/03_Contracts/Last Mile Delivery Limited/TLC-LMD-MSA-20260110-signed.pdf\tTrinityLondonConcierge/04_Finance/Last Mile Delivery/Last Mile INV-TLC 26004.pdf\tTrinityLondonConcierge/04_Finance/Last Mile Delivery/Last Mile INV-TLC 26010.pdf`,
  `Make Wealthy Investment Holdings Limited,Wedding and events advisory and coordination support,353190.40,TLC-MW-QUO-20251128\tTC-MW-QUO-2025-048\tTLC-MW-QUO-20260109\tTLC-MW-PRO-20260217\tTLC-MW-QUO-20260330\tTLC-MW-QUO-20260427\tTLC-MW-QUO-20260518,TLC-MW-MSA-20251203\tTC-MW-MSA-2025-048\tTLC-MW-MSA-20260114\tTLC-MW-MSA-20260222\tTLC-MW-MSA-20260330\tTLC-MW-MSA-20260428\tTLC-MW-MSA-20260521,233209.20,6,INV-TLC 26008\tINV-TLC 26015\tINV-TLC 26025\tINV-TLC 26044\tINV-TLC 26050\tINV-TLC 26058,"£31,884.00\t£32,395.20\t£32,394.00"`,
  `MOUTANGAL LIMITED,"Business strategy, recruitment and HR governance advisory programme",11960.00,TLC-MO-QUO-20260303,TLC-MO-CSA-20260304,11960.00,1,INV-TLC 26033,"£11,960.00",✅ 已闭环,报价 1 份\t合同 1 份\t发票 1 份,TrinityLondonConcierge/02_Sales/MOUTANGAL LIMITED /TLC-MO-QUO-20260303.pdf\tTrinityLondonConcierge/03_Contracts/MOUTANGAL LIMITED /TLC-MO-CSA-20260304.pdf\tTrinityLondonConcierge/04_Finance/MOUTANGAL/MOUTANGAL INV-TLC 26033.pdf`,
  `Saint Moment UK Limited,Annual Bookkeeping Service - Po Ying Cleaning Limited,14397.60,TLC-SM-QUO-20260602-MKSWL\tTLC-SM-QUO-20260602-PYCL,TLC-SM-MSA-20260529-MPMHK\tTLC-SM-MSA-20260529-YFHS,12600.00,2,INV-TLC 26062\tINV-TLC 26063,"£7,200.00\t£5,400.00",✅ 已闭环,报价 2 份\t合同 2 份\t发票 2 份,TrinityLondonConcierge/02_Sales/Saint Moment UK Limited/TLC-SM-QUO-20260602-MKSWL.pdf\tTrinityLondonConcierge/02_Sales/Saint Moment UK Limited/TLC-SM-QUO-20260602-PYCL.pdf\tTrinityLondonConcierge/03_Contracts/Saint Moment UK Limited/TLC-SM-MSA-20260529-MPMHK-signed.pdf\tTrinityLondonConcierge/03_Contracts/Saint Moment UK Limited/TLC-SM-MSA-20260529-YFHS-signed.pdf\tTrinityLondonConcierge/04_Finance/Saint Moment UK Limited/Invoice INV-TLC 26062.pdf\tTrinityLondonConcierge/04_Finance/Saint Moment UK Limited/Invoice INV-TLC 26063.pdf`,
  `Wood Surplus Limited,"UK market entry, import documentation and commercial coordination advisory",29000.00,TLC-WS-QUO-20251218,TLC-WS-MSA-20251228,29000.00,1,INV-TLC 26002,"£29,000.00",✅ 已闭环,报价 1 份\t合同 1 份\t发票 1 份,TrinityLondonConcierge/02_Sales/Wood Surplus Limited/TLC-WS-QUO-20251218-signed.pdf\tTrinityLondonConcierge/03_Contracts/Wood Surplus Limited/TLC-WS-MSA-20251228-signed.pdf\tTrinityLondonConcierge/04_Finance/Wood Surplus/Wood Surplus INV-TLC 26002.pdf`,
];

const propertyRowsRaw = [
  `Calo De Consulting Service Pte Limited\tData Insights + Monitor Lite — insights pack + monthly monitor\t28000\tTP-CD-PRO-20260113\tTP-CD-MSA-20260123\t33600\t1\tTPC-26015\t£33,600.00\t✅ 已闭环\t报价 1 份; 合同 1 份; 发票 1 份\tTrinityPropertyConsultancy/02_Sales/Calo De Consulting Service Pte Limited/TP-CD-PRO-20260113-signed.pdf; TrinityPropertyConsultancy/03_Contracts/Calo De Consulting Service Pte Limited/TP-CD-MSA-20260123-signed.pdf; TrinityPropertyConsultancy/04_Finance/Calo De Consulting/Calo De TPC-26015.pdf`,
  `ELLIOTT SURVEYING SERVICES LIMITED\tProperty surveying & consultancy quotation\t11820\tTP-ESS-QUO-20260320; TP-ESSL-QUO-20260511\tTP-ESS-MSA-20260325; TP-ESSL-MSA-20260513\t\t0\t\t\t⚠ 未开票\t报价 2 份; 合同 2 份\tTrinityPropertyConsultancy/02_Sales/ELLIOTT SURVEYING SERVICES LIMITED/TP-ESS-QUO-20260320-signed.pdf; TrinityPropertyConsultancy/02_Sales/ELLIOTT SURVEYING SERVICES LIMITED/TP-ESSL-QUO-20260511-signed.pdf; TrinityPropertyConsultancy/03_Contracts/ELLIOTT SURVEYING SERVICES LIMITED/TP-ESS-MSA-20260325-signed.pdf; TrinityPropertyConsultancy/03_Contracts/ELLIOTT SURVEYING SERVICES LIMITED/TP-ESSL-MSA-20260513-signed.pdf`,
  `Fu Cheung Equipment Limited\tWarehouse Feasibility Lite + Warehouse Governance Lite (Plus)\t70800\tTP-FC-PRO-20251110\tTP-FC-MSA-20251120\t97300\t2\t2025120301; TPC-26008\t£26,500.00; £70,800.00\t✅ 已闭环\t报价 1 份; 合同 1 份; 发票 2 份\tTrinityPropertyConsultancy/02_Sales/Fu Cheung Equipment Limited/TP-FC-PRO-20251110-signed.pdf; TrinityPropertyConsultancy/03_Contracts/Fu Cheung Equipment Limited/TP-FC-MSA-20251120-signed.pdf; TrinityPropertyConsultancy/04_Finance/Fu Cheung Equipment Limited/Property - Fu Cheung Equip Ltd 03.12.2025.pdf; TrinityPropertyConsultancy/04_Finance/Fu Cheung Equipment Limited/Fu Cheung TPC-26008.pdf`,
  `GLOBAL AMLCTF LIMITED\t\t12000\tTP-GA-QUO-20260420\tTP-GA-MSA-20260422\t\t0\t\t\t⚠ 未开票\t报价 1 份; 合同 1 份\tTrinityPropertyConsultancy/02_Sales/GLOBAL AMLCTF LIMITED/TP-GA-QUO-20260420-signed.pdf; TrinityPropertyConsultancy/03_Contracts/GLOBAL AMLCTF LIMITED/TP-GA-MSA-20260422-signed.pdf`,
  `HW. KENSINGTON MANAGEMENT LIMITED\tResidential Property Management — tenancy pack + certs + reports\t45552\tTP-HWK-QUO-20260318; TP-HWK-QUO-20260401; TP-HWK-QUO-20260428; TP-HWK-QUO-20260501\tTP-HWK-MSA-20260318; TP-HWK-MSA-20260403; TP-HWK-MSA-20260430; TP-HWK-MSA-20260507\t\t0\t\t\t⚠ 未开票\t报价 4 份; 合同 4 份\tTrinityPropertyConsultancy/02_Sales/HW KENSINGTON MANAGEMENT LIMITED/TP-HWK-QUO-20260318-signed.pdf; TrinityPropertyConsultancy/02_Sales/HW KENSINGTON MANAGEMENT LIMITED/TP-HWK-QUO-20260401-signed.pdf; TrinityPropertyConsultancy/02_Sales/HW KENSINGTON MANAGEMENT LIMITED/TP-HWK-QUO-20260428-signed.pdf; TrinityPropertyConsultancy/02_Sales/HW KENSINGTON MANAGEMENT LIMITED/TP-HWK-QUO-20260501 (signed).pdf; TrinityPropertyConsultancy/03_Contracts/HW KENSINGTON MANAGEMENT LIMITED/TP-HWK-MSA-20260318-signed.pdf; TrinityPropertyConsultancy/03_Contracts/HW KENSINGTON MANAGEMENT LIMITED/TP-HWK-MSA-20260403-signed.pdf; TrinityPropertyConsultancy/03_Contracts/HW KENSINGTON MANAGEMENT LIMITED/TP-HWK-MSA-20260430-signed.pdf; TrinityPropertyConsultancy/03_Contracts/HW KENSINGTON MANAGEMENT LIMITED/TP-HWK-MSA-20260507 (signed).pdf`,
  `JIUJU LIMITED\tQuantity VAT Amount GBP B1 - Renovation / Fit-out Planning & Governance 0.40 20% 7,399.60 B2 - UK Local Market & Industry Insight Report 0.40 20% 2,599.60 B3 - Materials Supply Plan (Procurement Governance) 0.40 20% 3,39\t60512.98\tTP-JIUJU-QUO-20251224; TP-JIUJU-QUO-20260103; TP-JIUJU-QUO-20260206\tTP-JIUJU-MSA-20260103; TP-JIUJU-MSA-20260113; TP-JIUJU-MSA-20260216\t60512.98\t3\tTPC-26010; TPC-26007; TPC-26025\t£19,965.60; £10,000.00; £30,547.38\t✅ 已闭环\t报价 3 份; 合同 3 份; 发票 3 份\tTrinityPropertyConsultancy/02_Sales/JIUJU LIMITED/TP-JIUJU-QUO-20251224.docx; TrinityPropertyConsultancy/02_Sales/JIUJU LIMITED/TP-JIUJU-QUO-20260103.docx; TrinityPropertyConsultancy/02_Sales/JIUJU LIMITED/TP-JIUJU-QUO-20260206.docx; TrinityPropertyConsultancy/03_Contracts/JIUJU LIMITED/TP-JIUJU-MSA-20260103.docx; TrinityPropertyConsultancy/03_Contracts/JIUJU LIMITED/TP-JIUJU-MSA-20260113.docx; TrinityPropertyConsultancy/03_Contracts/JIUJU LIMITED/TP-JIUJU-MSA-20260216.docx; TrinityPropertyConsultancy/04_Finance/JIUJU LIMITED/Jiuju TPC-26010.pdf; TrinityPropertyConsultancy/04_Finance/JIUJU LIMITED/Jiuju Ltd TPC-26007.pdf; TrinityPropertyConsultancy/04_Finance/JIUJU LIMITED/Jiuju TPC-26025.pdf`,
  `Joy Team (HK) Holdings Limited\tProperty Advisory Retainer (Tier M) + Supplier Governance Setup\t93600\tTP-JT-PRO-20251212\tTP-JT-MSA-20251222\t93600\t1\tTPC-26018\t£93,600.00\t✅ 已闭环\t报价 1 份; 合同 1 份; 发票 1 份\tTrinityPropertyConsultancy/02_Sales/Joy Team (HK) Holdings Limited/TP-JT-PRO-20251212-signed.pdf; TrinityPropertyConsultancy/03_Contracts/Joy Team (HK) Holdings Limited/TP-JT-MSA-20251222-signed.pdf; TrinityPropertyConsultancy/04_Finance/Joy Team (HK) Holdings Limited/Joy Team TPC-26018.pdf`,
  `Last Mile Delivery Limited\tWarehouse Feasibility Lite + Warehouse Governance Lite (Plus)\t207009\tTP-LMD-QUO-20251112; TP-LM-PRO-20251204; TP-LMD-QUO-20260328\tTP-LMD-MSA-20251122; TP-LMD-MSA-20251214; TP-LMD-MSA-20260417\t117597.6\t4\t2025120201; TPC-26016; TPC-26042; TPC-26083\t£18,000.00; £66,000.00; £16,798.80; £16,798.80\t✅ 已闭环\t报价 3 份; 合同 3 份; 发票 4 份\tTrinityPropertyConsultancy/02_Sales/Last Mile Delivery Limited/TP-LMD-QUO-20251112-unsigned.docx; TrinityPropertyConsultancy/02_Sales/Last Mile Delivery Limited/TP-LM-PRO-20251204-signed.pdf; TrinityPropertyConsultancy/02_Sales/Last Mile Delivery Limited/TP-LMD-QUO-20260328-signed.pdf; TrinityPropertyConsultancy/03_Contracts/Last Mile Delivery Limited/TP-LMD-MSA-20251122-signed.pdf; TrinityPropertyConsultancy/03_Contracts/Last Mile Delivery Limited/TP-LMD-MSA-20251214-signed.pdf; TrinityPropertyConsultancy/03_Contracts/Last Mile Delivery Limited/TP-LMD-MSA-20260417-signed.pdf; TrinityPropertyConsultancy/04_Finance/Last Mile Delivery/Property - Last Mile System 02.12.2025.pdf; TrinityPropertyConsultancy/04_Finance/Last Mile Delivery/Last Mile Delivery TPC-26016.pdf; TrinityPropertyConsultancy/04_Finance/Last Mile Delivery/last mile TPC-26042.pdf; TrinityPropertyConsultancy/04_Finance/Last Mile Delivery/Invoice TPC-26083.pdf`,
  `LONDON LIN FOODS HOUSE LTD\tSupplier chain consulting + maintenance support\t12000\tTP-LLF-QUO-2026-001\tTP-LLF-MSA-20260129\t12000\t1\tTPC-26011\t£12,000.00\t✅ 已闭环\t报价 1 份; 合同 1 份; 发票 1 份\tTrinityPropertyConsultancy/02_Sales/LONDON LIN FOODS HOUSE LTD/TP- LLF-QUO-2026-001_signed.pdf; TrinityPropertyConsultancy/03_Contracts/LONDON LIN FOODS HOUSE LTD/TP-LLF-MSA-20260129-signed.pdf; TrinityPropertyConsultancy/04_Finance/London Inn/London Inn TPC-26011.pdf`,
  `Make Wealthy Investment Holdings Limited\tRate Price Unit\t37500\tTP-MWI-QUO-20251112\tTP-MWI-MSA-20251122\t37500\t1\t2025120201\t£37,500.00\t✅ 已闭环\t报价 1 份; 合同 1 份; 发票 1 份\tTrinityPropertyConsultancy/02_Sales/Make Wealth Investment Holding Limited/TP-MWI-QUO-20251112.docx; TrinityPropertyConsultancy/03_Contracts/Make Wealth Investment Holding Limited/TP-MWI-MSA-20251122.docx; TrinityPropertyConsultancy/04_Finance/Make Wealthy Investment Holdings Limited/Property - Make Wealth Investment 02.12.2025 .pdf`,
  `MK ELITE TRADING LTD\tD-Series Restaurant Ops Package — quick bundle + checklist + governance lite\t50385.6\tTP-MK-QUO-2026-002; TP-MK-QUO-20260320\tTP-MK-MSA-20260327\t29597.6\t4\tTPC-26013; TPC-26032; TPC-26040; TPC-26041\t£20,000.00; £4,198.80; £4,198.80; £1,200.00\t✅ 已闭环\t报价 2 份; 合同 1 份; 发票 4 份\tTrinityPropertyConsultancy/02_Sales/MK ELITE TRADING LTD/TP-MK-QUO-2026-002_signed.pdf; TrinityPropertyConsultancy/02_Sales/MK ELITE TRADING LTD/TP-MK-QUO-20260320-signed.pdf; TrinityPropertyConsultancy/03_Contracts/MK ELITE TRADING LTD/TP-MK-MSA-20260327-signed.pdf; TrinityPropertyConsultancy/04_Finance/MK Elite/MK Elite TPC-26013.pdf; TrinityPropertyConsultancy/04_Finance/MK Elite/MK ELITE TPC-26032.pdf; TrinityPropertyConsultancy/04_Finance/MK Elite/Mk elite TPC-26040.pdf; TrinityPropertyConsultancy/04_Finance/MK Elite/Mk elite TPC-26041.pdf`,
  `MK Legend Trading Ltd\tand\t25008\tTP-MKL-QUO-20260501; TP-MKL-QUO-20260511; TP-MKL-QUO-20260513\tTP-MKL-MSA-20260505; TP-MKL-MSA-20260514; TP-MKL-MSA-20260518\t\t0\t\t\t⚠ 未开票\t报价 3 份; 合同 3 份\tTrinityPropertyConsultancy/02_Sales/MK Legend Trading Ltd/TP-MKL-QUO-20260501 (signed).pdf; TrinityPropertyConsultancy/02_Sales/MK Legend Trading Ltd/TP-MKL-QUO-20260511-signed.pdf; TrinityPropertyConsultancy/02_Sales/MK Legend Trading Ltd/TP-MKL-QUO-20260513 (signed) (1).pdf; TrinityPropertyConsultancy/03_Contracts/MK Legend Trading Ltd/TP-MKL-MSA-20260505 (signed).pdf; TrinityPropertyConsultancy/03_Contracts/MK Legend Trading Ltd/TP-MKL-MSA-20260514-signed.pdf; TrinityPropertyConsultancy/03_Contracts/MK Legend Trading Ltd/TP-MKL-MSA-20260518-signed.pdf`,
  `Saint Moment Limited\tData Insights + Monitor Lite — insights pack + monthly monitor\t20000\tTP-SM-PRO-20260121\tTP-SM-MSA-20260131\t24000\t1\tTPC-26017\t£24,000.00\t✅ 已闭环\t报价 1 份; 合同 1 份; 发票 1 份\tTrinityPropertyConsultancy/02_Sales/Saint Moment Limited/TP-SM-PRO-20260121-signed.pdf; TrinityPropertyConsultancy/03_Contracts/Saint Moment Limited/TP-SM-MSA-20260131-signed.pdf; TrinityPropertyConsultancy/04_Finance/Saint Moment/Saint Moment TPC-26017.pdf`,
  `SAYRAM LTD\tConsulting + support — supplier chain consulting + maintenance\t27992\tTP-SA-QUO-20260120; TP-SA-QUO-20260131; TP-SA-QUO-20260203; TP-SAY-QUO-20260420\tTP-SA-MSA-20260130; TP-SA-MSA-20260210; TP-SA-MSA-20260213; TP-SAY-MSA-20260427\t6998\t2\tTPC-26014; TPC-26022\t£4,000.00; £2,998.00\t✅ 已闭环\t报价 4 份; 合同 4 份; 发票 2 份\tTrinityPropertyConsultancy/02_Sales/SAYRAM LTD/TP-SA-QUO-20260120.docx; TrinityPropertyConsultancy/02_Sales/SAYRAM LTD/TP-SA-QUO-20260131.docx; TrinityPropertyConsultancy/02_Sales/SAYRAM LTD/TP-SA-QUO-20260203 (signed).pdf; TrinityPropertyConsultancy/02_Sales/SAYRAM LTD/TP-SAY-QUO-20260420 (signed).pdf; TrinityPropertyConsultancy/03_Contracts/SAYRAM LTD/TP-SA-MSA-20260130.docx; TrinityPropertyConsultancy/03_Contracts/SAYRAM LTD/TP-SA-MSA-20260210.docx; TrinityPropertyConsultancy/03_Contracts/SAYRAM LTD/TP-SA-MSA-20260213-signed.pdf; TrinityPropertyConsultancy/03_Contracts/SAYRAM LTD/TP-SAY-MSA-20260427 (signed).pdf; TrinityPropertyConsultancy/04_Finance/SAYRAM LTD/Invoice TPC-26014.pdf; TrinityPropertyConsultancy/04_Finance/SAYRAM LTD/Sayram TPC-26022.pdf`,
  `Sevene Group Limited\tVAT Amount GBP Weekly consultancy retainer - advisory and delivery support (coordination, reporting, stakeholder liaison) 20% 5,416.67 Supplier chain consulting - sourcing strategy, vendor shortlist/onboarding workflow,\t24632\tTP-SG-QUO-20260106; TP-SG-QUO-20260521\tTP-SG-MSA-20260116; TP-SG-MSA-20260526\t24632\t2\tTPC-26019; TPC-26077\t£12,000.00; £12,632.00\t✅ 已闭环\t报价 2 份; 合同 2 份; 发票 2 份\tTrinityPropertyConsultancy/02_Sales/Sevene Group Limited/TP-SG-QUO-20260106-signed.pdf; TrinityPropertyConsultancy/02_Sales/Sevene Group Limited/TP-SG-QUO-20260521.pdf; TrinityPropertyConsultancy/03_Contracts/Sevene Group Limited/TP-SG-MSA-20260116-signed.pdf; TrinityPropertyConsultancy/03_Contracts/Sevene Group Limited/TP-SG-MSA-20260526-signed.pdf; TrinityPropertyConsultancy/04_Finance/Sevene Group Limited/Sevene Group TPC-26019.pdf; TrinityPropertyConsultancy/04_Finance/Sevene Group Limited/Invoice TPC-26077.pdf`,
  `TF CH LONDON LTD\tand\t141600\tTP-TFCH-QUO-20260420; TP-TFCH-QUO-20260511\tTP-TFCH-MSA-20260501; TP-TFCH-MSA-20260515\t\t0\t\t\t⚠ 未开票\t报价 2 份; 合同 2 份\tTrinityPropertyConsultancy/02_Sales/TF CH LONDON LTD/TP-TFCH-QUO-20260420 (signed).pdf; TrinityPropertyConsultancy/02_Sales/TF CH LONDON LTD/TP-TFCH-QUO-20260511 (signed).pdf; TrinityPropertyConsultancy/03_Contracts/TF CH LONDON LTD/TP-TFCH-MSA-20260501 (signed).pdf; TrinityPropertyConsultancy/03_Contracts/TF CH LONDON LTD/TP-TFCH-MSA-20260515 (signed).pdf`,
  `THE AZUKI ROOM LTD\t\t6000\tTP-AZUKI-QUO-20260513\tTP-AZUKI-MSA-20260518\t\t0\t\t\t⚠ 未开票\t报价 1 份; 合同 1 份\tTrinityPropertyConsultancy/02_Sales/THE AZUKI ROOM LTD/TP-AZUKI-QUO-20260513 (signed).pdf; TrinityPropertyConsultancy/03_Contracts/THE AZUKI ROOM LTD/TP-AZUKI-MSA-20260518 (signed).pdf`,
  `Wood Surplus Limited\tWarehouse Feasibility Lite + Warehouse Governance Lite (Plus)\t94300\tTP-WS-PRO-20260106; TP-WS-PRO-20260512\tTP-WS-MSA-20260116; TP-WS-MSA-20260514\t105600\t2\tTPC-26020; TPC-26074\t£67,800.00; £37,800.00\t✅ 已闭环\t报价 2 份; 合同 2 份; 发票 2 份\tTrinityPropertyConsultancy/02_Sales/Wood Surplus Limited/TP-WS-PRO-20260106-signed.pdf; TrinityPropertyConsultancy/02_Sales/Wood Surplus Limited/TP-WS-PRO-20260512-signed.pdf; TrinityPropertyConsultancy/03_Contracts/Wood Surplus Limited/TP-WS-MSA-20260116-signed.pdf; TrinityPropertyConsultancy/03_Contracts/Wood Surplus Limited/TP-WS-MSA-20260514-signed.pdf; TrinityPropertyConsultancy/04_Finance/Wood Surplus/Wood Surplus TPC-26020.pdf; TrinityPropertyConsultancy/04_Finance/Wood Surplus/Invoice TPC-26074.pdf`,
  `ZUKER PROPERTY LTD\tRenovation Consulting Package\t12000\tTP-ZP-QUO-20260415; TP-ZP-QUO-20260519\tTP-ZP-MSA-20260420; TP-ZP-MSA-20260527\t6000\t1\tTPC-26044\t£6,000.00\t✅ 已闭环\t报价 2 份; 合同 2 份; 发票 1 份\tTrinityPropertyConsultancy/02_Sales/ZUKER PROPERTY LTD/TP-ZP-QUO-20260415 (signed).pdf; TrinityPropertyConsultancy/02_Sales/ZUKER PROPERTY LTD/TP-ZP-QUO-20260519.pdf; TrinityPropertyConsultancy/03_Contracts/ZUKER PROPERTY LTD/TP-ZP-MSA-20260420 (signed).pdf; TrinityPropertyConsultancy/03_Contracts/ZUKER PROPERTY LTD/TP-ZP-MSA-20260527.pdf; TrinityPropertyConsultancy/04_Finance/Zuker Property Ltd/Invoice TPC-26044.pdf`,
];

function normalizeId(base) {
  return base
    .replace(/\.(pdf|docx)$/i, "")
    .replace(/\s*\((?:signed|unsigned)\)(?:\s*\(\d+\))?/gi, "")
    .replace(/[_-](?:signed|unsigned)(?:-scan)?/gi, "")
    .replace(/\(1\)$/g, "")
    .replace(/\s+/g, "");
}

function extractStatus(str) {
  if (/unsigned/i.test(str)) return "unsigned";
  if (/signed/i.test(str)) return "signed";
  return "";
}

function extractDateFromId(id) {
  const compact = id.match(/20\d{6}/)?.[0];
  if (compact) return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  const parts = id.match(/20\d{2}-(\d{4})/);
  if (parts) return `${id.slice(parts.index, parts.index + 4)}-${parts[1].slice(0, 2)}-${parts[1].slice(2, 4)}`;
  return "";
}

function extractInvoiceId(path) {
  const base = path.split("/").pop() || "";
  return base.match(/INV-TLC\s*\d+|TPC-\d+|\d{10}/i)?.[0]?.replace(/\s+/g, " ").trim() || "";
}

function extractMoneyList(text) {
  return [...text.matchAll(/£\s*([\d,]+(?:\.\d+)?)/g)].map((m) => Number(m[1].replace(/,/g, "")));
}

function buildRowsFromSummary({
  rawRows,
  sourcePrefix,
  parser,
}) {
  const built = [];
  for (const raw of rawRows) {
    const summary = parser(raw);
    if (!summary.quotePaths.length) continue;

    const quoteCount = summary.quotePaths.length;
    const amounts = summary.perQuoteAmounts;
    const repeatedType = quoteCount > 1 ? "phase-based" : "one-off";

    for (let i = 0; i < quoteCount; i++) {
      const quotePath = summary.quotePaths[i];
      const quoteBase = quotePath.split("/").pop() || "";
      const quoteId = normalizeId(quoteBase);
      const quoteStatus = extractStatus(quoteBase) || "unsigned";
      const msaBase = summary.contractPaths[i] ? summary.contractPaths[i].split("/").pop() : (summary.contractPaths.length === 1 ? summary.contractPaths[0].split("/").pop() : "");
      const msaId = msaBase ? normalizeId(msaBase) : "";
      const msaStatus = msaBase ? extractStatus(msaBase) : "";
      const invoiceId = summary.invoiceIds.length === quoteCount
        ? summary.invoiceIds[i]
        : (summary.invoiceIds.length === 1 ? summary.invoiceIds[0] : "");
      const amount = quoteCount === 1
        ? summary.totalAmount
        : (amounts.length === quoteCount ? amounts[i] : "");

      built.push([
        summary.company,
        quoteId,
        quoteStatus,
        msaId,
        msaStatus,
        extractDateFromId(quoteId),
        amount,
        invoiceId,
        summary.service,
        repeatedType,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    }
  }
  return built;
}

function parseLondon(raw) {
  const company = raw.split(",")[0].trim();
  const serviceMatch = raw.match(/^[^,]+,(?:"([^"]+)"|([^,]+)),([\d.]+),/);
  const service = (serviceMatch?.[1] || serviceMatch?.[2] || "").trim();
  const totalAmount = serviceMatch?.[3] ? Number(serviceMatch[3]) : "";
  const quotePaths = [...raw.matchAll(/TrinityLondonConcierge\/02_Sales\/[^\t]+?\.(?:pdf|docx)/g)].map((m) => m[0]);
  const contractPaths = [...raw.matchAll(/TrinityLondonConcierge\/03_Contracts\/[^\t]+?\.(?:pdf|docx)/g)].map((m) => m[0]);
  const financePaths = [...raw.matchAll(/TrinityLondonConcierge\/04_Finance\/[^\t]+?\.(?:pdf|docx)/g)].map((m) => m[0]);
  const invoiceIds = financePaths.map(extractInvoiceId).filter(Boolean);
  const perQuoteAmounts = extractMoneyList(raw);
  return { company, service, totalAmount, quotePaths, contractPaths, invoiceIds, perQuoteAmounts };
}

function parseProperty(raw) {
  const cols = raw.split("\t");
  const company = (cols[0] || "").trim();
  const service = (cols[1] || "").trim();
  const totalAmount = cols[2] ? Number(String(cols[2]).replace(/,/g, "")) : "";
  const sourcePaths = [...raw.matchAll(/TrinityPropertyConsultancy\/(?:02_Sales|03_Contracts|04_Finance)\/[^;|]+?\.(?:pdf|docx)/g)].map((m) => m[0]);
  const quotePaths = sourcePaths.filter((p) => p.includes("/02_Sales/"));
  const contractPaths = sourcePaths.filter((p) => p.includes("/03_Contracts/"));
  const financePaths = sourcePaths.filter((p) => p.includes("/04_Finance/"));
  const invoiceIds = financePaths.map(extractInvoiceId).filter(Boolean);
  const perQuoteAmounts = extractMoneyList(raw);
  return { company, service, totalAmount, quotePaths, contractPaths, invoiceIds, perQuoteAmounts };
}

async function writeWorkbook(path, rows, createIfMissing = false) {
  let workbook;
  try {
    const input = await FileBlob.load(path);
    workbook = await SpreadsheetFile.importXlsx(input);
  } catch (error) {
    if (!createIfMissing) throw error;
    workbook = Workbook.create();
    workbook.worksheets.add("Sheet1");
  }

  const sheet = workbook.worksheets.getItem("Sheet1");
  sheet.getRange("A1:Q1").values = headers;
  sheet.getRange(`A2:Q${rows.length + 1}`).values = rows;
  const clearFrom = rows.length + 2;
  if (clearFrom <= 300) {
    sheet.getRange(`A${clearFrom}:Q300`).values = Array.from({ length: 301 - clearFrom }, () => Array.from({ length: 17 }, () => ""));
  }

  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(path);
}

const londonRows = buildRowsFromSummary({
  rawRows: londonRowsRaw,
  sourcePrefix: "TrinityLondonConcierge",
  parser: parseLondon,
});

const propertyRows = buildRowsFromSummary({
  rawRows: propertyRowsRaw,
  sourcePrefix: "TrinityPropertyConsultancy",
  parser: parseProperty,
});

await fs.mkdir(outDir, { recursive: true });
await writeWorkbook(londonPath, londonRows, false);
await writeWorkbook(propertyPath, propertyRows, true);

console.log(JSON.stringify({
  londonRows: londonRows.length,
  propertyRows: propertyRows.length,
  londonSample: londonRows.slice(0, 8),
  propertySample: propertyRows.slice(0, 8),
}, null, 2));
