CREATE DATABASE IF NOT EXISTS venus_crm;
USE venus_crm;

CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(32) NOT NULL,
  color VARCHAR(32) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL DEFAULT '',
  password_salt VARCHAR(255) NOT NULL DEFAULT '',
  name VARCHAR(255) NOT NULL,
  role VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_companies (
  user_id BIGINT NOT NULL,
  company_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (user_id, company_id),
  CONSTRAINT fk_user_companies_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_companies_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_sessions (
  token VARCHAR(128) PRIMARY KEY,
  user_id BIGINT NOT NULL,
  current_company_id VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_sessions_company FOREIGN KEY (current_company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(64) NOT NULL,
  priority VARCHAR(64) NOT NULL,
  due_date DATE NOT NULL,
  owners TEXT NOT NULL,
  tasks TEXT NOT NULL,
  CONSTRAINT fk_projects_company FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS crm_project_rows (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id VARCHAR(64) NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'manual',
  source_key VARCHAR(255) NOT NULL DEFAULT '',
  client_company VARCHAR(255) NOT NULL,
  quo_number VARCHAR(255) NOT NULL,
  quo_status VARCHAR(64) NOT NULL DEFAULT '',
  msa_number VARCHAR(255) NOT NULL DEFAULT '',
  msa_status VARCHAR(64) NOT NULL DEFAULT '',
  row_date VARCHAR(64) NOT NULL DEFAULT '',
  amount_gbp VARCHAR(64) NOT NULL DEFAULT '',
  related_invoice VARCHAR(255) NOT NULL DEFAULT '',
  deliverables TEXT NOT NULL,
  engagement_type VARCHAR(64) NOT NULL DEFAULT '',
  start_date VARCHAR(64) NOT NULL DEFAULT '',
  delivery_date VARCHAR(64) NOT NULL DEFAULT '',
  phase_1_status VARCHAR(64) NOT NULL DEFAULT '',
  phase_2_status VARCHAR(64) NOT NULL DEFAULT '',
  phase_3_status VARCHAR(64) NOT NULL DEFAULT '',
  msa_signer VARCHAR(255) NOT NULL DEFAULT '',
  completion_status VARCHAR(64) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_crm_project_rows_company FOREIGN KEY (company_id) REFERENCES companies(id)
);

INSERT IGNORE INTO companies (id, name, short_name, color) VALUES
  ('venus', 'Venus London Technology Limited', 'VL', '#4e8ef7'),
  ('trinity-property', 'Trinity Property Consultancy Limited', 'TP', '#14b8a6'),
  ('trinity-concierge', 'Trinity London Concierge Limited', 'TC', '#f97316'),
  ('ripplesoft', 'Ripplesoft Limited', 'RS', '#8b5cf6'),
  ('ripple-mic', 'Ripple MIC Limited', 'RM', '#ef4444'),
  ('luminarytech', 'Luminarytech Limited', 'LT', '#0ea5e9'),
  ('banyan-digital', 'Banyan Digital Limited', 'BD', '#22c55e'),
  ('momentum-growth', 'Momentum Growth Agency Limited', 'MG', '#f59e0b'),
  ('biocheck', 'Biocheck Health Limited', 'BH', '#10b981'),
  ('crestpoint-hr', 'CrestpointHR', 'CH', '#6366f1'),
  ('novasoft-tech', 'NovaSoftTech', 'NS', '#06b6d4');

INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'venus', 'VL · 官网改版', '完成公司官网与营销落地页的整体重设计。', '进行中', '高', '2024-12-31', 'Alice Johnson|Carol Lee', '实现登录功能|测试落地页'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'venus' AND name = 'VL · 官网改版');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'venus', 'VL · 移动端应用开发', '为销售与客户经理开发跨平台移动应用。', '已计划', '中', '2025-03-15', 'Bob Smith|Carol Lee|Eva Martinez', '设计引导页面|接入数据分析'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'venus' AND name = 'VL · 移动端应用开发');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'venus', 'VL · API 集成', '集成第三方支付、CRM 同步与邮件追踪服务。', '已暂停', '低', '2025-01-20', 'Alice Johnson|David Kim', '编写 API 文档'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'venus' AND name = 'VL · API 集成');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'venus', 'VL · 市场营销活动', '为第一季度客户线索增长上线多渠道营销活动。', '已计划', '高', '2024-11-01', 'Bob Smith', '审核广告素材|销售跟进流程'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'venus' AND name = 'VL · 市场营销活动');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'venus', 'VL · 数据迁移', '迁移旧 CRM 联系人与客户归属数据并完成清洗。', '进行中', '紧急', '2025-02-28', 'Carol Lee|Eva Martinez', '校验导入结果|清理重复数据'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'venus' AND name = 'VL · 数据迁移');

INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'trinity-property', 'TP · 官网改版', '完成公司官网与营销落地页的整体重设计。', '进行中', '高', '2024-12-31', 'Alice Johnson|Carol Lee', '实现登录功能|测试落地页'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'trinity-property' AND name = 'TP · 官网改版');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'trinity-property', 'TP · 移动端应用开发', '为销售与客户经理开发跨平台移动应用。', '已计划', '中', '2025-03-15', 'Bob Smith|Carol Lee|Eva Martinez', '设计引导页面|接入数据分析'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'trinity-property' AND name = 'TP · 移动端应用开发');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'trinity-property', 'TP · API 集成', '集成第三方支付、CRM 同步与邮件追踪服务。', '已暂停', '低', '2025-01-20', 'Alice Johnson|David Kim', '编写 API 文档'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'trinity-property' AND name = 'TP · API 集成');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'trinity-property', 'TP · 市场营销活动', '为第一季度客户线索增长上线多渠道营销活动。', '已计划', '高', '2024-11-01', 'Bob Smith', '审核广告素材|销售跟进流程'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'trinity-property' AND name = 'TP · 市场营销活动');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'trinity-property', 'TP · 数据迁移', '迁移旧 CRM 联系人与客户归属数据并完成清洗。', '进行中', '紧急', '2025-02-28', 'Carol Lee|Eva Martinez', '校验导入结果|清理重复数据'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'trinity-property' AND name = 'TP · 数据迁移');

INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'trinity-concierge', 'TC · 官网改版', '完成公司官网与营销落地页的整体重设计。', '进行中', '高', '2024-12-31', 'Alice Johnson|Carol Lee', '实现登录功能|测试落地页'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'trinity-concierge' AND name = 'TC · 官网改版');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'trinity-concierge', 'TC · 移动端应用开发', '为销售与客户经理开发跨平台移动应用。', '已计划', '中', '2025-03-15', 'Bob Smith|Carol Lee|Eva Martinez', '设计引导页面|接入数据分析'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'trinity-concierge' AND name = 'TC · 移动端应用开发');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'trinity-concierge', 'TC · API 集成', '集成第三方支付、CRM 同步与邮件追踪服务。', '已暂停', '低', '2025-01-20', 'Alice Johnson|David Kim', '编写 API 文档'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'trinity-concierge' AND name = 'TC · API 集成');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'trinity-concierge', 'TC · 市场营销活动', '为第一季度客户线索增长上线多渠道营销活动。', '已计划', '高', '2024-11-01', 'Bob Smith', '审核广告素材|销售跟进流程'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'trinity-concierge' AND name = 'TC · 市场营销活动');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'trinity-concierge', 'TC · 数据迁移', '迁移旧 CRM 联系人与客户归属数据并完成清洗。', '进行中', '紧急', '2025-02-28', 'Carol Lee|Eva Martinez', '校验导入结果|清理重复数据'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'trinity-concierge' AND name = 'TC · 数据迁移');

INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'ripplesoft', 'RS · 官网改版', '完成公司官网与营销落地页的整体重设计。', '进行中', '高', '2024-12-31', 'Alice Johnson|Carol Lee', '实现登录功能|测试落地页'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'ripplesoft' AND name = 'RS · 官网改版');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'ripplesoft', 'RS · 移动端应用开发', '为销售与客户经理开发跨平台移动应用。', '已计划', '中', '2025-03-15', 'Bob Smith|Carol Lee|Eva Martinez', '设计引导页面|接入数据分析'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'ripplesoft' AND name = 'RS · 移动端应用开发');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'ripplesoft', 'RS · API 集成', '集成第三方支付、CRM 同步与邮件追踪服务。', '已暂停', '低', '2025-01-20', 'Alice Johnson|David Kim', '编写 API 文档'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'ripplesoft' AND name = 'RS · API 集成');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'ripplesoft', 'RS · 市场营销活动', '为第一季度客户线索增长上线多渠道营销活动。', '已计划', '高', '2024-11-01', 'Bob Smith', '审核广告素材|销售跟进流程'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'ripplesoft' AND name = 'RS · 市场营销活动');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'ripplesoft', 'RS · 数据迁移', '迁移旧 CRM 联系人与客户归属数据并完成清洗。', '进行中', '紧急', '2025-02-28', 'Carol Lee|Eva Martinez', '校验导入结果|清理重复数据'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'ripplesoft' AND name = 'RS · 数据迁移');

INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'ripple-mic', 'RM · 官网改版', '完成公司官网与营销落地页的整体重设计。', '进行中', '高', '2024-12-31', 'Alice Johnson|Carol Lee', '实现登录功能|测试落地页'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'ripple-mic' AND name = 'RM · 官网改版');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'ripple-mic', 'RM · 移动端应用开发', '为销售与客户经理开发跨平台移动应用。', '已计划', '中', '2025-03-15', 'Bob Smith|Carol Lee|Eva Martinez', '设计引导页面|接入数据分析'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'ripple-mic' AND name = 'RM · 移动端应用开发');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'ripple-mic', 'RM · API 集成', '集成第三方支付、CRM 同步与邮件追踪服务。', '已暂停', '低', '2025-01-20', 'Alice Johnson|David Kim', '编写 API 文档'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'ripple-mic' AND name = 'RM · API 集成');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'ripple-mic', 'RM · 市场营销活动', '为第一季度客户线索增长上线多渠道营销活动。', '已计划', '高', '2024-11-01', 'Bob Smith', '审核广告素材|销售跟进流程'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'ripple-mic' AND name = 'RM · 市场营销活动');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'ripple-mic', 'RM · 数据迁移', '迁移旧 CRM 联系人与客户归属数据并完成清洗。', '进行中', '紧急', '2025-02-28', 'Carol Lee|Eva Martinez', '校验导入结果|清理重复数据'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'ripple-mic' AND name = 'RM · 数据迁移');

INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'luminarytech', 'LT · 官网改版', '完成公司官网与营销落地页的整体重设计。', '进行中', '高', '2024-12-31', 'Alice Johnson|Carol Lee', '实现登录功能|测试落地页'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'luminarytech' AND name = 'LT · 官网改版');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'luminarytech', 'LT · 移动端应用开发', '为销售与客户经理开发跨平台移动应用。', '已计划', '中', '2025-03-15', 'Bob Smith|Carol Lee|Eva Martinez', '设计引导页面|接入数据分析'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'luminarytech' AND name = 'LT · 移动端应用开发');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'luminarytech', 'LT · API 集成', '集成第三方支付、CRM 同步与邮件追踪服务。', '已暂停', '低', '2025-01-20', 'Alice Johnson|David Kim', '编写 API 文档'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'luminarytech' AND name = 'LT · API 集成');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'luminarytech', 'LT · 市场营销活动', '为第一季度客户线索增长上线多渠道营销活动。', '已计划', '高', '2024-11-01', 'Bob Smith', '审核广告素材|销售跟进流程'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'luminarytech' AND name = 'LT · 市场营销活动');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'luminarytech', 'LT · 数据迁移', '迁移旧 CRM 联系人与客户归属数据并完成清洗。', '进行中', '紧急', '2025-02-28', 'Carol Lee|Eva Martinez', '校验导入结果|清理重复数据'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'luminarytech' AND name = 'LT · 数据迁移');

INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'banyan-digital', 'BD · 官网改版', '完成公司官网与营销落地页的整体重设计。', '进行中', '高', '2024-12-31', 'Alice Johnson|Carol Lee', '实现登录功能|测试落地页'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'banyan-digital' AND name = 'BD · 官网改版');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'banyan-digital', 'BD · 移动端应用开发', '为销售与客户经理开发跨平台移动应用。', '已计划', '中', '2025-03-15', 'Bob Smith|Carol Lee|Eva Martinez', '设计引导页面|接入数据分析'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'banyan-digital' AND name = 'BD · 移动端应用开发');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'banyan-digital', 'BD · API 集成', '集成第三方支付、CRM 同步与邮件追踪服务。', '已暂停', '低', '2025-01-20', 'Alice Johnson|David Kim', '编写 API 文档'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'banyan-digital' AND name = 'BD · API 集成');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'banyan-digital', 'BD · 市场营销活动', '为第一季度客户线索增长上线多渠道营销活动。', '已计划', '高', '2024-11-01', 'Bob Smith', '审核广告素材|销售跟进流程'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'banyan-digital' AND name = 'BD · 市场营销活动');
INSERT INTO projects (company_id, name, description, status, priority, due_date, owners, tasks)
SELECT 'banyan-digital', 'BD · 数据迁移', '迁移旧 CRM 联系人与客户归属数据并完成清洗。', '进行中', '紧急', '2025-02-28', 'Carol Lee|Eva Martinez', '校验导入结果|清理重复数据'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE company_id = 'banyan-digital' AND name = 'BD · 数据迁移');
