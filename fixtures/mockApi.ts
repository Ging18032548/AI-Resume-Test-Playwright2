import { test as base, expect, type Page } from '@playwright/test';

type MockUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'USER';
  createdAt: string;
  lastLoginAt: string | null;
};

type MockResume = {
  id: number;
  userId: number;
  originalName: string;
  storedName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  pageCount: number;
  characterCount: number;
  extractionStatus: string;
  status: string;
  chunkingStatus: string;
  chunkCount: number;
};

type MockState = {
  user: MockUser;
  token: string;
  displayName: string;
  resumes: Array<MockResume>;
  analysisId: number;
  registeredEmails: Set<string>;
};

function response(data: unknown, message = 'OK', status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: status < 400, message, data }),
  };
}

function jwt(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `eyJhbGciOiJub25lIn0.${payload}.mock`;
}

function getBody(request: { postData(): string | null }): Record<string, unknown> {
  try {
    return JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

export const test = base.extend<{ mockApi: void }>({
  mockApi: [async ({ page }, use) => {
    // ★ แก้ไขที่ 1: MOCK_API=false → ไม่ mock อะไรเลย (ยิง backend จริง)
    // MOCK_API=true หรือไม่ได้ตั้ง → mock ทุก request ไม่แตะ database
    if (process.env.MOCK_API === 'false') {
      await use();
      return;
    }

    const now = new Date().toISOString();
    const state: MockState = {
      user: {
        id: 1,
        firstName: 'QA',
        lastName: 'Tester',
        email: 'qa@example.test',
        role: 'USER',
        createdAt: now,
        lastLoginAt: now,
      },
      token: jwt(),
      displayName: 'QA',
      resumes: [],
      analysisId: 100,
      registeredEmails: new Set(),
    };

    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname.replace(/^.*\/api/, '');
      const body = getBody(request);

      // ★ แก้ไขที่ 2 (เพิ่มใหม่): ปุ่ม OAuth login ที่แอปเรียกตอนโหลดหน้า
      if (path === '/auth/oauth/providers' && request.method() === 'GET') {
        await route.fulfill(response({ providers: [] }));
        return;
      }

      if (path === '/auth/login' && request.method() === 'POST') {
        if (String(body.email ?? '').endsWith('.invalid') || String(body.password ?? '').startsWith('Wrong')) {
          await route.fulfill(response(null, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 401));
          return;
        }
        state.user.email = String(body.email ?? state.user.email);
        await route.fulfill(response({ user: state.user, token: state.token }, 'เข้าสู่ระบบสำเร็จ'));
        return;
      }

      if (path === '/auth/register' && request.method() === 'POST') {
        const email = String(body.email ?? state.user.email);
        if (state.registeredEmails.has(email)) {
          await route.fulfill(response(null, 'อีเมลนี้ถูกใช้งานแล้ว', 409));
          return;
        }
        state.registeredEmails.add(email);
        state.user.firstName = String(body.firstName ?? 'QA');
        state.user.lastName = String(body.lastName ?? 'Tester');
        state.user.email = email;
        state.displayName = state.user.firstName;
        await route.fulfill(response({ user: state.user, token: state.token }, 'สมัครสมาชิกสำเร็จ', 201));
        return;
      }

      if (path === '/auth/me' && request.method() === 'GET') {
        await route.fulfill(response({ user: state.user }, 'ดึงข้อมูลผู้ใช้สำเร็จ'));
        return;
      }

      if (path === '/auth/forgot-password' && request.method() === 'POST') {
        await route.fulfill(response(null, 'หากอีเมลนี้มีบัญชีอยู่ในระบบ เราได้ส่งรหัส OTP ไปแล้ว'));
        return;
      }

      if (path === '/auth/change-password' && request.method() === 'POST') {
        const current = String(body.currentPassword ?? '');
        const next = String(body.newPassword ?? '');
        const confirm = String(body.confirmPassword ?? '');
        if (current.startsWith('Wrong') || next.length < 8 || (confirm && next !== confirm)) {
          await route.fulfill(response(null, 'Password is invalid or does not match (รหัสผ่านไม่ถูกต้องหรือไม่ตรงกัน)', 400));
          return;
        }
        await route.fulfill(response(null, 'เปลี่ยนรหัสผ่านสำเร็จ'));
        return;
      }

      if (path === '/profile' && request.method() === 'GET') {
        await route.fulfill(response({
          profile: {
            userId: state.user.id, phone: null, location: null,
            headline: state.displayName, university: null, faculty: null,
            major: null, educationLevel: null, graduationYear: null,
            interestedPosition: null, experienceLevel: null, bio: null,
          },
        }));
        return;
      }

      if (path === '/profile' && request.method() === 'PUT') {
        if (body.headline === '') {
          await route.fulfill(response(null, 'Headline is required', 400));
          return;
        }
        state.displayName = String(body.headline ?? state.displayName);
        await route.fulfill(response({ profile: { userId: state.user.id, ...body } }, 'บันทึกสำเร็จ'));
        return;
      }

      if (path === '/resumes' && request.method() === 'GET') {
        await route.fulfill(response({ resumes: state.resumes }));
        return;
      }

      if (path === '/resumes/upload' && request.method() === 'POST') {
        const uploadData = request.postDataBuffer()?.toString('latin1') ?? request.postData() ?? '';
        const contentLength = Number(request.headers()['content-length'] ?? 0);
        if (/not-a-cv|fake-extension|oversized/i.test(uploadData) || contentLength > 5 * 1024 * 1024) {
          await route.fulfill(response(null, 'ไฟล์ไม่ถูกต้องหรือมีขนาดใหญ่เกินกำหนด', 400));
          return;
        }
        const resume: MockResume = {
          id: state.resumes.length + 1, userId: state.user.id,
          originalName: 'mock-resume.pdf', storedName: 'mock-resume.pdf',
          filePath: 'mock-resume.pdf', mimeType: 'application/pdf', fileSize: 1024,
          pageCount: 1, characterCount: 100, extractionStatus: 'COMPLETED',
          status: 'COMPLETED', chunkingStatus: 'COMPLETED', chunkCount: 1,
        };
        state.resumes.push(resume);
        await route.fulfill(response({ resume }, 'อัปโหลดสำเร็จ'));
        return;
      }

      if (/^\/resumes\/\d+\/analyses$/.test(path) && request.method() === 'POST') {
        state.analysisId += 1;
        await route.fulfill(response({
          analysisRun: {
            id: state.analysisId, resumeId: Number(path.split('/')[2]), userId: state.user.id,
            jobDescriptionId: null, job: null, analysisType: 'BASE', status: 'COMPLETED',
            baseResumeScore: 82, jobMatchScore: null,
            scores: { contactInformation: 10, professionalSummary: 10, skills: 12, experience: 12, projects: 10, education: 10, readability: 10 },
            jobMatch: null, summary: 'Mock analysis', strengths: ['Clear experience'],
            weaknesses: ['Add measurable results'], recommendations: ['Improve summary'],
            promptVersion: 'mock', model: 'mock', attemptCount: 1, errorCode: null, errorMessage: null,
            createdAt: now, updatedAt: now,
          },
        }));
        return;
      }

      if (/^\/analyses\/\d+$/.test(path) && request.method() === 'GET') {
        await route.fulfill(response({
          analysisRun: {
            id: Number(path.split('/')[2]), resumeId: 1, userId: state.user.id,
            jobDescriptionId: null, job: null, analysisType: 'BASE', status: 'COMPLETED',
            baseResumeScore: 82, jobMatchScore: null,
            scores: { contactInformation: 10, professionalSummary: 10, skills: 12, experience: 12, projects: 10, education: 10, readability: 10 },
            jobMatch: null, summary: 'Mock analysis', strengths: ['Clear experience'],
            weaknesses: ['Add measurable results'], recommendations: ['Improve summary'],
            promptVersion: 'mock', model: 'mock', attemptCount: 1, errorCode: null, errorMessage: null,
            createdAt: now, updatedAt: now,
          },
        }));
        return;
      }

      // ★ แก้ไขที่ 3: เติม mock data ให้ /jobs (เดิมคืน array ว่าง)
      // ปรับชื่อ field ให้ตรงกับที่ frontend เรนเดอร์จริง (ดูจาก DevTools → Network)
      if (path.startsWith('/jobs')) {
        await route.fulfill(response({
          jobs: [
            { id: 1, title: 'Frontend Developer', company: 'Mock Co., Ltd.', location: 'Bangkok', employmentType: 'FULL_TIME', postedAt: now },
            { id: 2, title: 'Data Analyst', company: 'Mock Inc.', location: 'Remote', employmentType: 'CONTRACT', postedAt: now },
            { id: 3, title: 'Backend Engineer', company: 'Mock Tech', location: 'Chiang Mai', employmentType: 'FULL_TIME', postedAt: now },
          ],
        }));
        return;
      }

      if (path.startsWith('/job-descriptions')) {
        await route.fulfill(response({
          jobDescriptions: [{ id: 1, title: 'Frontend Developer', description: 'Mock job description' }],
          jobDescription: { id: 1, title: 'Frontend Developer', description: 'Mock job description' },
        }));
        return;
      }

      if (path.startsWith('/analyses') || path.includes('/chunks') || path.includes('/embeddings')) {
        await route.fulfill(response({ analyses: [], chunks: [] }));
        return;
      }

      // ★ แก้ไขที่ 4: แจ้งเตือน endpoint ที่ยังไม่ได้ mock
      console.warn(`[mockApi] unmocked endpoint: ${request.method()} ${path}`);
      await route.fulfill(response({}));
    });

    await use();
    await page.unroute('**/api/**');
  }, { auto: true }],
});

export { expect, type Page };