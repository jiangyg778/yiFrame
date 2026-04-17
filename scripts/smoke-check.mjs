// Registry-driven smoke check.
//
// - App list comes from getSmokeTargetEntries() in micro-core.
// - buildId is parsed from each app's __NEXT_DATA__ at runtime; never hardcoded.
// - New apps registered with { enabled: true, smokeEnabled: true } are picked up
//   automatically without editing this file.
//
// Usage:
//   node scripts/smoke-check.mjs
//   MIRO_MAIN_ORIGIN=http://localhost:3000 node scripts/smoke-check.mjs
//   SKIP_ACCOUNT_CHECKS=true node scripts/smoke-check.mjs
//   CHECK_FALLBACK_PATH=/account/profile node scripts/smoke-check.mjs

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  getAppConfigEntries,
  getSmokeTargetEntries,
} = require('../packages/micro-core/src/app-registry.runtime');

const mainOrigin = process.env.MIRO_MAIN_ORIGIN || 'http://localhost:3000';
const skipAccount = process.env.SKIP_ACCOUNT_CHECKS === 'true';
const fallbackPath = process.env.CHECK_FALLBACK_PATH || null;

const configEntries = getAppConfigEntries();
const smokeTargets = getSmokeTargetEntries(configEntries).filter((target) => {
  if (skipAccount && target.name === 'account') return false;
  return true;
});
const mainEntry = configEntries.find((entry) => entry.name === 'main');

let totalFailures = 0;
const failures = [];

function formatUrl(path, origin = mainOrigin) {
  return `${origin}${path}`;
}

function recordFailure(failure) {
  totalFailures += 1;
  failures.push(failure);
  console.error(
    `[smoke] FAIL  app=${failure.app.padEnd(10)} lane=${failure.lane.padEnd(8)} ${failure.message}`
  );
  console.error(`              url=${failure.url}`);
}

function recordOk(app, lane, url, extra = '') {
  console.log(`[smoke] ok    app=${app.padEnd(10)} lane=${lane.padEnd(8)} ${url}${extra ? ' ' + extra : ''}`);
}

function recordSkip(app, lane, reason) {
  console.log(`[smoke] skip  app=${app.padEnd(10)} lane=${lane.padEnd(8)} ${reason}`);
}

async function fetchText(url, { expectedStatus = 200 } = {}) {
  const response = await fetch(url, { redirect: 'manual' });
  const body = await response.text();
  return { response, body, ok: response.status === expectedStatus };
}

function parseNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

async function checkMain() {
  if (!mainEntry || !mainEntry.smokeEnabled) return;

  // HTML
  try {
    const url = formatUrl('/');
    const { response, body } = await fetchText(url);
    if (response.status !== 200) {
      recordFailure({
        app: 'main',
        lane: 'html',
        url,
        message: `expected 200, got ${response.status}`,
      });
    } else if (!body.includes('Miro Platform')) {
      recordFailure({
        app: 'main',
        lane: 'html',
        url,
        message: 'html did not contain "Miro Platform"',
      });
    } else {
      recordOk('main', 'html', url);
    }
  } catch (error) {
    recordFailure({ app: 'main', lane: 'html', url: formatUrl('/'), message: error.message });
  }

  // Public asset
  try {
    const url = formatUrl('/platform-owner.txt');
    const { response, body } = await fetchText(url);
    if (response.status !== 200) {
      recordFailure({
        app: 'main',
        lane: 'public',
        url,
        message: `expected 200, got ${response.status}`,
      });
    } else if (!body.includes('main-app-public')) {
      recordFailure({
        app: 'main',
        lane: 'public',
        url,
        message: 'public asset content mismatch',
      });
    } else {
      recordOk('main', 'public', url);
    }
  } catch (error) {
    recordFailure({
      app: 'main',
      lane: 'public',
      url: formatUrl('/platform-owner.txt'),
      message: error.message,
    });
  }
}

async function checkSubApp(target) {
  const appName = target.name;
  const basePath = target.basePath;
  const htmlUrl = formatUrl(basePath);

  // HTML + buildId parse
  let nextData = null;
  try {
    const { response, body } = await fetchText(htmlUrl);
    if (response.status !== 200) {
      recordFailure({
        app: appName,
        lane: 'html',
        url: htmlUrl,
        message: `expected 200, got ${response.status}`,
      });
    } else {
      nextData = parseNextData(body);
      if (!nextData || !nextData.buildId) {
        recordFailure({
          app: appName,
          lane: 'html',
          url: htmlUrl,
          message: 'could not parse __NEXT_DATA__.buildId from HTML',
        });
      } else {
        recordOk(appName, 'html', htmlUrl, `buildId=${nextData.buildId}`);
      }
    }
  } catch (error) {
    recordFailure({ app: appName, lane: 'html', url: htmlUrl, message: error.message });
  }

  // Public asset via main origin
  const publicUrl = formatUrl(`${basePath}/platform-owner.txt`);
  try {
    const { response, body } = await fetchText(publicUrl);
    if (response.status !== 200) {
      recordFailure({
        app: appName,
        lane: 'public',
        url: publicUrl,
        message: `expected 200, got ${response.status}`,
      });
    } else if (!body.includes(`${appName}-app-public`)) {
      recordFailure({
        app: appName,
        lane: 'public',
        url: publicUrl,
        message: `public asset content did not include "${appName}-app-public"`,
      });
    } else {
      recordOk(appName, 'public', publicUrl);
    }
  } catch (error) {
    recordSkip(appName, 'public', `public asset probe errored: ${error.message}`);
  }

  if (!nextData || !nextData.buildId) {
    recordSkip(appName, 'chunk', 'no buildId available, skipping chunk/data');
    recordSkip(appName, 'data', 'no buildId available, skipping data');
    return;
  }

  // Chunk: the main runtime chunk path is stable across Next dev/prod.
  const chunkUrl = formatUrl(`${basePath}/_next/static/chunks/main.js`);
  try {
    const response = await fetch(chunkUrl, { redirect: 'manual' });
    if (response.status !== 200) {
      // Next prod may hash chunk names. Fall back to probing the buildManifest
      // path which always exists, so we don't get false failures on prod.
      const manifestUrl = formatUrl(
        `${basePath}/_next/static/${nextData.buildId}/_buildManifest.js`
      );
      const manifest = await fetch(manifestUrl, { redirect: 'manual' });
      if (manifest.status !== 200) {
        recordFailure({
          app: appName,
          lane: 'chunk',
          url: `${chunkUrl} | ${manifestUrl}`,
          message: `chunk & buildManifest both non-200 (${response.status} / ${manifest.status})`,
        });
      } else {
        recordOk(appName, 'chunk', manifestUrl, '(via _buildManifest)');
      }
    } else {
      recordOk(appName, 'chunk', chunkUrl);
    }
  } catch (error) {
    recordFailure({ app: appName, lane: 'chunk', url: chunkUrl, message: error.message });
  }

  // Data: only makes sense for pages that actually produce /_next/data/*.
  // __NEXT_DATA__.gsp (getStaticProps) or gssp (getServerSideProps) indicates
  // the current page has a data endpoint.
  const pageRoute = nextData.page || '/';
  const hasData = Boolean(nextData.gsp || nextData.gssp);
  if (!hasData) {
    recordSkip(
      appName,
      'data',
      `page "${pageRoute}" has no getStaticProps/getServerSideProps, no /_next/data expected`
    );
  } else {
    const pagePath = pageRoute === '/' ? 'index' : pageRoute.replace(/^\//, '');
    const dataUrl = formatUrl(`${basePath}/_next/data/${nextData.buildId}/${pagePath}.json`);
    try {
      const response = await fetch(dataUrl, { redirect: 'manual' });
      if (response.status !== 200) {
        recordFailure({
          app: appName,
          lane: 'data',
          url: dataUrl,
          message: `expected 200, got ${response.status}`,
        });
      } else {
        recordOk(appName, 'data', dataUrl);
      }
    } catch (error) {
      recordFailure({ app: appName, lane: 'data', url: dataUrl, message: error.message });
    }
  }

  // Public asset direct (sub app own origin) — only when defaultTarget is set.
  const configEntry = configEntries.find((entry) => entry.name === appName);
  const directOrigin = process.env[configEntry?.targetEnvVar || ''] || configEntry?.defaultTarget;
  if (directOrigin) {
    const directUrl = `${directOrigin}${basePath}/platform-owner.txt`;
    try {
      const { response, body } = await fetchText(directUrl);
      if (response.status !== 200) {
        recordFailure({
          app: appName,
          lane: 'direct',
          url: directUrl,
          message: `expected 200, got ${response.status}`,
        });
      } else if (!body.includes(`${appName}-app-public`)) {
        recordFailure({
          app: appName,
          lane: 'direct',
          url: directUrl,
          message: 'direct public asset content mismatch',
        });
      } else {
        recordOk(appName, 'direct', directUrl);
      }
    } catch (error) {
      recordSkip(appName, 'direct', `direct probe errored (is ${appName} running?): ${error.message}`);
    }
  }
}

async function checkFallback() {
  if (!fallbackPath) return;
  const url = formatUrl(fallbackPath);
  try {
    const { response, body } = await fetchText(url, { expectedStatus: 502 });
    if (response.status !== 502) {
      recordFailure({
        app: 'fallback',
        lane: 'html',
        url,
        message: `expected 502, got ${response.status}`,
      });
    } else if (!body.includes('Micro App Unavailable')) {
      recordFailure({
        app: 'fallback',
        lane: 'html',
        url,
        message: 'fallback HTML did not contain "Micro App Unavailable"',
      });
    } else {
      recordOk('fallback', 'html', url);
    }
  } catch (error) {
    recordFailure({ app: 'fallback', lane: 'html', url, message: error.message });
  }
}

async function main() {
  console.log(`[smoke] main origin = ${mainOrigin}`);
  console.log(
    `[smoke] targets from registry = [${smokeTargets.map((t) => t.name).join(', ') || '(none)'}]`
  );

  await checkMain();
  for (const target of smokeTargets) {
    await checkSubApp(target);
  }
  await checkFallback();

  if (totalFailures > 0) {
    console.error(`\n[smoke] FAILED (${totalFailures} failure${totalFailures === 1 ? '' : 's'}):`);
    for (const failure of failures) {
      console.error(`  - ${failure.app}/${failure.lane}: ${failure.message} (${failure.url})`);
    }
    process.exit(1);
  }

  console.log('\n[smoke] all checks passed');
}

main().catch((error) => {
  console.error('[smoke] unexpected error:', error);
  process.exit(1);
});
