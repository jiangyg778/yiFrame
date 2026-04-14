const origin = process.env.MIRO_MAIN_ORIGIN || 'http://localhost:3000';
const activityOrigin = process.env.MIRO_ACTIVITY_ORIGIN || 'http://localhost:3001';

const checks = [
  { label: 'main html', path: '/', expectedStatus: 200, contains: 'Miro Platform' },
  { label: 'main public asset', path: '/platform-owner.txt', expectedStatus: 200, contains: 'main-app-public' },
  { label: 'activity html', path: '/activity', expectedStatus: 200, contains: 'Activity 子应用' },
  { label: 'activity chunk', path: '/activity/_next/static/chunks/main.js', expectedStatus: 200 },
  { label: 'activity data', path: '/activity/_next/data/development/list.json', expectedStatus: 200 },
  { label: 'activity public asset via main', path: '/activity/platform-owner.txt', expectedStatus: 200, contains: 'activity-app-public' },
];

const directChecks = [
  {
    label: 'activity public asset direct',
    origin: activityOrigin,
    path: '/activity/platform-owner.txt',
    expectedStatus: 200,
    contains: 'activity-app-public',
  },
];

if (process.env.SKIP_ACCOUNT_CHECKS !== 'true') {
  checks.push(
    { label: 'account html', path: '/account/profile', expectedStatus: 200, contains: '个人资料' },
    { label: 'account chunk', path: '/account/_next/static/chunks/main.js', expectedStatus: 200 },
    { label: 'account data', path: '/account/_next/data/development/profile.json', expectedStatus: 200 }
  );
}

if (process.env.CHECK_FALLBACK_PATH) {
  checks.push({
    label: 'fallback html',
    path: process.env.CHECK_FALLBACK_PATH,
    expectedStatus: 502,
    contains: 'Micro App Unavailable',
  });
}

async function runCheck(check) {
  const targetOrigin = check.origin || origin;
  const url = `${targetOrigin}${check.path}`;
  const response = await fetch(url, { redirect: 'manual' });
  const body = await response.text();

  if (response.status !== check.expectedStatus) {
    throw new Error(
      `${check.label} failed: expected ${check.expectedStatus}, got ${response.status} (${url})`
    );
  }

  if (check.contains && !body.includes(check.contains)) {
    throw new Error(`${check.label} failed: response did not contain "${check.contains}" (${url})`);
  }

  console.log(`[smoke] ok - ${check.label}: ${response.status} ${url}`);
}

async function main() {
  for (const check of checks) {
    await runCheck(check);
  }

  for (const check of directChecks) {
    await runCheck(check);
  }
}

main().catch((error) => {
  console.error('[smoke] failed:', error.message);
  process.exit(1);
});
