import { randomUUID } from 'crypto';

const API_URL = 'http://localhost:3001/api';
let AUTH_TOKEN = '';
let CSRF_TOKEN = '';

// Configuration
const _TARGET_PEOPLE = 5000; // Reserved for future use
const DEPT_DEPTH = 3;
const MAX_CHILDREN_PER_DEPT = 3;
const PEOPLE_PER_DEPT_MIN = 30;
const PEOPLE_PER_DEPT_MAX = 60;

async function request(path: string, method: string = 'GET', body?: Record<string, unknown>) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }
  if (CSRF_TOKEN) {
    headers['X-CSRF-Token'] = CSRF_TOKEN;
    headers['Cookie'] = `csrf-token=${CSRF_TOKEN}`;
  }

  // Node 18+ provides fetch as a global
  // eslint-disable-next-line no-undef
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed: ${method} ${path} ${res.status} - ${text}`);
  }

  // Get CSRF token from cookie if returned
  const setCookie = res.headers.get('set-cookie');
  if (setCookie && setCookie.includes('csrf-token=')) {
    const match = setCookie.match(/csrf-token=([^;]+)/);
    if (match) CSRF_TOKEN = match[1];
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    if (data.csrfToken) CSRF_TOKEN = data.csrfToken;
    return data;
  }
  return res.text();
}

async function main() {
  console.log('🚀 Seeding via API...');

  // 0. Fetch initial CSRF token
  console.log('Fetching CSRF token...');
  await request('/csrf-token');
  console.log('✅ CSRF Token received');

  // 1. Signup / Login
  const email = `api-seed-${Date.now()}@example.com`;
  const password = 'SecurePassword123!';

  console.log(`Creating user ${email}...`);
  try {
    await request('/auth/signup', 'POST', {
      name: 'API Seeder',
      email,
      password,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.log('Signup failed (maybe user exists), trying login...', message);
  }

  const loginRes = await request('/auth/login', 'POST', {
    email,
    password,
  });

  AUTH_TOKEN = loginRes.accessToken;
  if (!AUTH_TOKEN) throw new Error('No token received');

  console.log('✅ Authenticated');

  // 2. Create Organization
  console.log('Creating Organization...');
  // The endpoint is actually POST /api/organizations based on index.ts
  const org = await request('/organizations', 'POST', {
    name: 'Performance Corp API',
  });
  const orgId = org.id;
  console.log(`✅ Org created: ${orgId}`);

  // 3. Create Departments & People
  let peopleCount = 0;
  let deptCount = 0;

  async function createDept(parentId: string | null, depth: number) {
    if (depth > DEPT_DEPTH) return;

    // Create dept
    const deptName = `Dept ${depth}-${randomUUID().substring(0, 4)}`;
    // Check departments API. Assuming POST /organizations/:orgId/departments
    // needed properties: name, parentId?
    const dept = await request(`/organizations/${orgId}/departments`, 'POST', {
      name: deptName,
      parentId: parentId || undefined,
    });
    deptCount++;
    const deptId = dept.id;

    // Add People
    const numPeople =
      Math.floor(Math.random() * (PEOPLE_PER_DEPT_MAX - PEOPLE_PER_DEPT_MIN + 1)) +
      PEOPLE_PER_DEPT_MIN;

    const peoplePromises = [];
    for (let i = 0; i < numPeople; i++) {
      peopleCount++;
      const pName = `User ${peopleCount}`;
      peoplePromises.push(
        request(`/departments/${deptId}/people`, 'POST', {
          name: pName,
          title: `Role ${depth}`,
          email: `user${peopleCount}-${randomUUID().substring(0, 4)}@example.com`,
          phone: '555-0100',
        }).catch(e => console.error(`Failed to create person: ${e.message}`))
      );
    }
    await Promise.all(peoplePromises);

    // Children
    if (depth < DEPT_DEPTH) {
      const numChildren = Math.floor(Math.random() * MAX_CHILDREN_PER_DEPT) + 1;
      for (let i = 0; i < numChildren; i++) {
        await createDept(deptId, depth + 1);
      }
    }
  }

  console.log('Generating tree using recursive API calls...');
  await createDept(null, 0);

  console.log('✅ Seeding Complete via API');
  console.log(`Org ID: ${orgId}`);
  console.log(`Departments: ${deptCount}`);
  console.log(`People: ${peopleCount}`);
}

main().catch(console.error);
