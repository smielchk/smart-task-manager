import { request } from 'playwright';
import { expect } from '@playwright/test';

// ============================================================
// Smart Task Manager — QA 对抗性 API 测试 (FCT + BND + DAT)
// ============================================================
const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:18000';

// ============================================================
// 辅助函数
// ============================================================
let token = null;
const headers = { 'Content-Type': 'application/json' };

async function register(api, username, password) {
  const resp = await api.post('/api/auth/register', {
    data: { username, password }
  });
  return { status: resp.status(), body: await resp.json() };
}

async function login(api, username, password) {
  const resp = await api.post('/api/auth/login', {
    data: { username, password }
  });
  const body = await resp.json();
  // 尝试多种响应格式获取 token
  const t = body.data?.token || body.data?.access_token || body.token || body.access_token;
  if (t) {
    token = t;
    headers['Authorization'] = `Bearer ${token}`;
  }
  return { status: resp.status(), body };
}

async function ensureAuth(api) {
  if (!token) {
    const reg = await register(api, 'qa_testuser', 'QaTest12345');
    if (reg.status >= 400) {
      // 可能已注册，尝试登录
      await login(api, 'qa_testuser', 'QaTest12345');
    } else {
      const t = reg.body.data?.token || reg.body.data?.access_token || reg.body.token;
      if (t) { token = t; headers['Authorization'] = `Bearer ${token}`; }
    }
    if (!token) {
      await login(api, 'qa_testuser', 'QaTest12345');
    }
  }
}

// ============================================================
// FCT: 功能正确性 (8 用例)
// ============================================================

async function test_fct_001_register_password_validation(api) {
  console.log('[FCT_001] 用户注册-密码校验 (AC-011-01)');
  // 短密码
  const r1 = await register(api, 'short_pwd_user', '123');
  console.log(`  短密码(3位): ${r1.status} (预期 422/400)`);
  const pass1 = r1.status === 422 || r1.status === 400;
  // 纯数字
  const r2 = await register(api, 'digits_user', '12345678');
  console.log(`  纯数字(8位): ${r2.status} (预期 422/400)`);
  const pass2 = r2.status === 422 || r2.status === 400;
  // 合法密码
  const r3 = await register(api, 'valid_user_qa', 'ValidPass1');
  console.log(`  合法密码: ${r3.status} (预期 200/201)`);
  const pass3 = r3.status === 200 || r3.status === 201;
  return (pass1 && pass2 && pass3) ? 'PASS' : 'FAIL';
}

async function test_fct_002_login_jwt(api) {
  console.log('[FCT_002] 登录获取 JWT (AC-011-02)');
  const { status, body } = await login(api, 'qa_testuser', 'QaTest12345');
  console.log(`  状态码: ${status}, has_token: ${!!token}`);
  return (status === 200 && !!token) ? 'PASS' : 'FAIL';
}

async function test_fct_003_task_create_validation(api) {
  console.log('[FCT_003] 创建任务-必填校验 (AC-001-01)');
  await ensureAuth(api);
  // 缺标题
  const r1 = await api.post('/api/tasks', {
    headers, data: { description: '无标题任务' }
  });
  console.log(`  缺标题: ${r1.status()} (预期 422)`);
  const pass1 = r1.status() === 422;
  // 正常创建
  const r2 = await api.post('/api/tasks', {
    headers, data: {
      title: 'QA 测试任务', description: '自动化测试创建',
      priority: 'P1', status: 'pending', estimated_minutes: 60
    }
  });
  const body = await r2.json();
  console.log(`  正常创建: ${r2.status()}, id=${body.data?.id || body.id || 'N/A'}`);
  const pass2 = r2.status() === 200 || r2.status() === 201;
  return (pass1 && pass2) ? 'PASS' : 'FAIL';
}

async function test_fct_004_task_update(api) {
  console.log('[FCT_004] 编辑任务-同步更新 (AC-001-03)');
  await ensureAuth(api);
  // 先获取任务列表找第一个
  const list = await api.get('/api/tasks?page=1&page_size=1', { headers });
  const lb = await list.json();
  const items = lb.data?.items || lb.data || lb.items || [];
  if (items.length === 0) return 'BLOCKED: 无任务';
  const tid = items[0].id;
  
  const update = await api.put(`/api/tasks/${tid}`, {
    headers, data: { title: 'QA 更新后标题', priority: 'P0' }
  });
  console.log(`  更新: ${update.status()}`);
  
  // 验证
  const verify = await api.get(`/api/tasks/${tid}`, { headers });
  const vb = await verify.json();
  const task = vb.data || vb;
  const match = task.title === 'QA 更新后标题' && task.priority === 'P0';
  console.log(`  验证: title="${task.title}", priority="${task.priority}", match=${match}`);
  return match ? 'PASS' : 'FAIL';
}

async function test_fct_005_task_status_flow(api) {
  console.log('[FCT_005] 状态流转: complete→reopen (AC-001-05/06)');
  await ensureAuth(api);
  const list = await api.get('/api/tasks?page=1&page_size=1', { headers });
  const lb = await list.json();
  const items = lb.data?.items || lb.data || lb.items || [];
  if (items.length === 0) return 'BLOCKED: 无任务';
  const tid = items[0].id;
  
  // 标记完成
  const c1 = await api.patch(`/api/tasks/${tid}/status`, {
    headers, data: { status: 'completed' }
  });
  const c1b = await c1.json();
  const task1 = c1b.data || c1b;
  const hasCompletedAt = !!task1.completed_at;
  console.log(`  完成后 completed_at 非空: ${hasCompletedAt}`);
  
  // 重新打开
  const c2 = await api.patch(`/api/tasks/${tid}/status`, {
    headers, data: { status: 'pending' }
  });
  const c2b = await c2.json();
  const task2 = c2b.data || c2b;
  const completedAtNull = !task2.completed_at || task2.completed_at === null;
  console.log(`  重新打开后 completed_at 为空: ${completedAtNull}`);
  
  return (hasCompletedAt && completedAtNull) ? 'PASS' : 'FAIL';
}

async function test_fct_006_categories_init(api) {
  console.log('[FCT_006] 预设分类初始化 (AC-003-01)');
  await ensureAuth(api);
  const resp = await api.get('/api/categories', { headers });
  const body = await resp.json();
  const cats = body.data || body.data?.items || body.items || body;
  const count = Array.isArray(cats) ? cats.length : (cats.total || 0);
  console.log(`  分类数量: ${count} (预期 >= 6)`);
  return count >= 6 ? 'PASS' : 'FAIL';
}

async function test_fct_007_settings_crud(api) {
  console.log('[FCT_007] 设置修改持久化 (AC-011-04)');
  await ensureAuth(api);
  // 获取
  const get = await api.get('/api/settings', { headers });
  console.log(`  获取设置: ${get.status()}`);
  // 更新
  const update = await api.put('/api/settings', {
    headers, data: { timezone: 'Asia/Shanghai', daily_work_hours: 8, theme: 'dark' }
  });
  console.log(`  更新设置: ${update.status()}`);
  // 验证
  const verify = await api.get('/api/settings', { headers });
  const vb = await verify.json();
  const settings = vb.data || vb;
  console.log(`  验证 theme: ${settings.theme}`);
  return settings.theme === 'dark' ? 'PASS' : 'FAIL';
}

async function test_fct_008_preferences_reset(api) {
  console.log('[FCT_008] 偏好重置回退默认 (AC-010-06)');
  await ensureAuth(api);
  const resp = await api.post('/api/preferences/reset', { headers });
  console.log(`  重置偏好: ${resp.status()}`);
  return resp.status() === 200 ? 'PASS' : 'FAIL';
}

// ============================================================
// BND: 边界与异常 (6 用例)
// ============================================================

async function test_bnd_001_long_title(api) {
  console.log('[BND_001] 超长标题 (200+字符) (REQ-001)');
  await ensureAuth(api);
  const longTitle = 'A'.repeat(201);
  const resp = await api.post('/api/tasks', {
    headers, data: { title: longTitle }
  });
  console.log(`  201字符标题: ${resp.status()} (预期 422/400)`);
  return (resp.status() === 422 || resp.status() === 400) ? 'PASS' : 'FAIL';
}

async function test_bnd_002_invalid_priority(api) {
  console.log('[BND_002] 无效优先级值 (REQ-001)');
  await ensureAuth(api);
  const resp = await api.post('/api/tasks', {
    headers, data: { title: '测试', priority: 'P99' }
  });
  console.log(`  priority=P99: ${resp.status()} (预期 422)`);
  return (resp.status() === 422 || resp.status() === 400) ? 'PASS' : 'FAIL';
}

async function test_bnd_003_empty_page(api) {
  console.log('[BND_003] 超大页码 (REQ-001)');
  await ensureAuth(api);
  const resp = await api.get('/api/tasks?page=9999&page_size=20', { headers });
  const body = await resp.json();
  const items = body.data?.items || body.data || body.items || [];
  console.log(`  page=9999: items=${items.length}, status=${resp.status()}`);
  return resp.status() === 200 && items.length === 0 ? 'PASS' : 'FAIL';
}

async function test_bnd_004_nonexistent_task(api) {
  console.log('[BND_004] 不存在的任务ID (REQ-001)');
  await ensureAuth(api);
  const resp = await api.get('/api/tasks/99999', { headers });
  console.log(`  GET /api/tasks/99999: ${resp.status()} (预期 404)`);
  return resp.status() === 404 ? 'PASS' : 'FAIL';
}

async function test_bnd_005_duplicate_register(api) {
  console.log('[BND_005] 重复用户名注册 (REQ-011)');
  const resp = await register(api, 'qa_testuser', 'QaTest12345');
  console.log(`  重复注册: ${resp.status} (预期 400/409)`);
  return (resp.status === 400 || resp.status === 409) ? 'PASS' : 'FAIL';
}

async function test_bnd_006_long_nlp_input(api) {
  console.log('[BND_006] NLP 超长输入 (REQ-002)');
  await ensureAuth(api);
  const longInput = 'A'.repeat(501);
  const resp = await api.post('/api/tasks/parse-nlp', {
    headers, data: { input: longInput, timezone: 'Asia/Shanghai' }
  });
  console.log(`  501字符输入: ${resp.status()} (预期 422/400)`);
  return (resp.status() === 422 || resp.status() === 400) ? 'PASS' : 'FAIL';
}

// ============================================================
// DAT: 数据完整性 (4 用例)
// ============================================================

async function test_dat_001_soft_delete(api) {
  console.log('[DAT_001] 软删除不物理删除 (REQ-001)');
  await ensureAuth(api);
  // 创建
  const c = await api.post('/api/tasks', {
    headers, data: { title: 'DAT-删除测试' }
  });
  const cb = await c.json();
  const tid = cb.data?.id || cb.id;
  if (!tid) return 'BLOCKED: 创建失败';
  
  // 软删除
  const d = await api.delete(`/api/tasks/${tid}`, { headers });
  console.log(`  删除: ${d.status()}`);
  
  // 默认列表不应包含
  const list = await api.get('/api/tasks?page=1&page_size=100', { headers });
  const lb = await list.json();
  const items = lb.data?.items || lb.data || lb.items || [];
  const inList = items.some(t => t.id === tid);
  console.log(`  默认列表包含: ${inList} (预期 false)`);
  
  // 回收站应包含
  const trash = await api.get('/api/tasks?include_deleted=true', { headers });
  const tb = await trash.json();
  const trashItems = tb.data?.items || tb.data || tb.items || [];
  const inTrash = trashItems.some(t => t.id === tid);
  console.log(`  回收站包含: ${inTrash} (预期 true)`);
  
  return (!inList && inTrash) ? 'PASS' : 'FAIL';
}

async function test_dat_002_multi_tag_association(api) {
  console.log('[DAT_002] 任务多标签关联 (REQ-003)');
  await ensureAuth(api);
  // 创建 3 个标签
  const tags = [];
  for (let i = 0; i < 3; i++) {
    const r = await api.post('/api/tags', {
      headers, data: { name: `dat_tag_${Date.now()}_${i}` }
    });
    const rb = await r.json();
    const tag = rb.data || rb;
    if (tag.id) tags.push(tag.id);
  }
  console.log(`  创建标签数: ${tags.length}`);
  
  if (tags.length < 3) return 'BLOCKED: 标签创建不足';
  
  // 创建任务关联标签
  const c = await api.post('/api/tasks', {
    headers, data: { title: 'DAT-标签关联', tag_ids: tags }
  });
  const cb = await c.json();
  const task = cb.data || cb;
  const taskTags = task.tags || [];
  console.log(`  任务标签数: ${taskTags.length} (预期 3)`);
  
  return taskTags.length === 3 ? 'PASS' : 'FAIL';
}

async function test_dat_003_completed_at_accuracy(api) {
  console.log('[DAT_003] 完成时间戳准确性 (REQ-001)');
  await ensureAuth(api);
  const before = new Date().toISOString();
  
  // 创建+完成
  const c = await api.post('/api/tasks', {
    headers, data: { title: 'DAT-时间戳' }
  });
  const cb = await c.json();
  const tid = cb.data?.id || cb.id;
  
  const s = await api.patch(`/api/tasks/${tid}/status`, {
    headers, data: { status: 'completed' }
  });
  const sb = await s.json();
  const task = sb.data || sb;
  const after = new Date().toISOString();
  
  const completedAt = task.completed_at;
  console.log(`  completed_at: ${completedAt}`);
  console.log(`  before: ${before}, after: ${after}`);
  
  if (!completedAt) return 'FAIL: completed_at 为空';
  const cat = new Date(completedAt);
  return (cat >= new Date(before) && cat <= new Date(after)) ? 'PASS' : 'FAIL';
}

async function test_dat_004_timestamps_maintenance(api) {
  console.log('[DAT_004] created_at/updated_at 自动维护 (REQ-001)');
  await ensureAuth(api);
  // 创建
  const c = await api.post('/api/tasks', {
    headers, data: { title: 'DAT-时间维护' }
  });
  const cb = await c.json();
  const task1 = cb.data || cb;
  console.log(`  created_at: ${task1.created_at}, updated_at: ${task1.updated_at}`);
  if (!task1.created_at) return 'FAIL: created_at 为空';
  
  // 等待一小段时间
  await new Promise(r => setTimeout(r, 100));
  
  // 更新
  const u = await api.put(`/api/tasks/${task1.id}`, {
    headers, data: { title: 'DAT-时间维护-更新' }
  });
  const ub = await u.json();
  const task2 = ub.data || ub;
  console.log(`  更新后 updated_at: ${task2.updated_at}`);
  
  const updatedGt = new Date(task2.updated_at) >= new Date(task1.created_at);
  return updatedGt ? 'PASS' : 'FAIL';
}

// ============================================================
// 主执行
// ============================================================
const results = { PASS: 0, FAIL: 0, BLOCKED: 0 };
const api = await request.newContext({ baseURL: BASE_URL });

const tests = [
  // FCT (8)
  test_fct_001_register_password_validation,
  test_fct_002_login_jwt,
  test_fct_003_task_create_validation,
  test_fct_004_task_update,
  test_fct_005_task_status_flow,
  test_fct_006_categories_init,
  test_fct_007_settings_crud,
  test_fct_008_preferences_reset,
  // BND (6)
  test_bnd_001_long_title,
  test_bnd_002_invalid_priority,
  test_bnd_003_empty_page,
  test_bnd_004_nonexistent_task,
  test_bnd_005_duplicate_register,
  test_bnd_006_long_nlp_input,
  // DAT (4)
  test_dat_001_soft_delete,
  test_dat_002_multi_tag_association,
  test_dat_003_completed_at_accuracy,
  test_dat_004_timestamps_maintenance,
];

for (const test of tests) {
  try {
    const result = await test(api);
    results[result]++;
    console.log(`  → ${result}\n`);
  } catch (e) {
    results.BLOCKED++;
    console.log(`  → BLOCKED: ${e.message}\n`);
  }
}

console.log('='.repeat(60));
console.log(`FCT+BND+DAT: PASS=${results.PASS} FAIL=${results.FAIL} BLOCKED=${results.BLOCKED}`);
console.log(`总计: ${tests.length} 用例`);
process.exit(results.FAIL > 0 ? 1 : 0);
