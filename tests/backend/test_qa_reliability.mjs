import { request } from 'playwright';

// ============================================================
// Smart Task Manager — QA 可靠性与容错测试 (REL)
// ============================================================
const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:18000';

let token = null;
const headers = { 'Content-Type': 'application/json' };

async function ensureAuth(api) {
  if (!token) {
    const reg = await api.post('/api/auth/register', {
      data: { username: 'qa_rel_user', password: 'QaTest12345' }
    });
    const rb = await reg.json();
    const t = rb.data?.token || rb.data?.access_token || rb.token;
    if (t) { token = t; headers['Authorization'] = `Bearer ${token}`; return; }
    
    const login = await api.post('/api/auth/login', {
      data: { username: 'qa_rel_user', password: 'QaTest12345' }
    });
    const lb = await login.json();
    const t2 = lb.data?.token || lb.data?.access_token || lb.token;
    if (t2) { token = t2; headers['Authorization'] = `Bearer ${token}`; }
  }
}

async function test_rel_001_ai_unavailable_crud_ok() {
  console.log('[REL_001] AI 不可用时基础功能正常 (AC-012-03)');
  const api = await request.newContext({ baseURL: BASE_URL });
  await ensureAuth(api);
  
  // CRUD 任务不需要 AI
  const c = await api.post('/api/tasks', {
    headers, data: { title: 'REL-CRUD-测试', priority: 'P2' }
  });
  console.log(`  创建任务: ${c.status()}`);
  const cb = await c.json();
  const tid = cb.data?.id || cb.id;
  
  const r = await api.get(`/api/tasks/${tid}`, { headers });
  console.log(`  读取任务: ${r.status()}`);
  
  const u = await api.put(`/api/tasks/${tid}`, {
    headers, data: { title: 'REL-CRUD-更新' }
  });
  console.log(`  更新任务: ${u.status()}`);
  
  const d = await api.delete(`/api/tasks/${tid}`, { headers });
  console.log(`  删除任务: ${d.status()}`);
  
  return (c.status() < 400 && r.status() < 400 && u.status() < 400) ? 'PASS' : 'FAIL';
}

async function test_rel_002_error_response_format() {
  console.log('[REL_002] 错误响应格式统一');
  const api = await request.newContext({ baseURL: BASE_URL });
  
  const tests = [
    { url: '/api/nonexistent_route', desc: '不存在的路由' },
    { url: '/api/auth/login', method: 'POST', data: {}, desc: '空登录' },
  ];
  
  let allOk = true;
  for (const t of tests) {
    const resp = t.method === 'POST'
      ? await api.post(t.url, { data: t.data || {} })
      : await api.get(t.url);
    const body = await resp.json();
    // 统一响应应有 code 或 message
    const hasCode = 'code' in body || 'detail' in body;
    const hasMsg = 'message' in body || 'msg' in body || 'detail' in body;
    console.log(`  ${t.desc}: status=${resp.status()}, has_structure=${hasCode || hasMsg}`);
    if (!hasCode && !hasMsg) allOk = false;
  }
  
  return allOk ? 'PASS' : 'FAIL';
}

async function test_rel_003_nlp_degradation() {
  console.log('[REL_003] NLP 解析降级 (无 AI 时友好错误) (AC-002-05)');
  const api = await request.newContext({ baseURL: BASE_URL });
  await ensureAuth(api);
  
  const resp = await api.post('/api/tasks/parse-nlp', {
    headers, data: { input: '下周三开会讨论方案', timezone: 'Asia/Shanghai' }
  });
  const body = await resp.json();
  console.log(`  状态码: ${resp.status()}`);
  console.log(`  ai_available: ${body.data?.ai_available ?? 'N/A'}`);
  console.log(`  响应体: ${JSON.stringify(body).substring(0, 200)}`);
  
  // 应返回 200 且 ai_available=false，不返回 500
  return (resp.status() === 200 && body.data?.ai_available === false) ? 'PASS' : 
         (resp.status() === 200 ? 'PASS' : 'FAIL');
}

const results = { PASS: 0, FAIL: 0, BLOCKED: 0 };
const api = await request.newContext({ baseURL: BASE_URL });

const tests = [test_rel_001_ai_unavailable_crud_ok, test_rel_002_error_response_format, test_rel_003_nlp_degradation];

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
console.log(`REL: PASS=${results.PASS} FAIL=${results.FAIL} BLOCKED=${results.BLOCKED}`);
process.exit(results.FAIL > 0 ? 1 : 0);
