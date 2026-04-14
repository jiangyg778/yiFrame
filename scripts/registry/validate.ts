import { getAppConfigEntries } from '../../packages/micro-core/src';

try {
  const entries = getAppConfigEntries();
  console.log(`[registry] valid - ${entries.length} apps`);
  entries.forEach((entry) => {
    console.log(
      `- ${entry.name} ${entry.basePath} enabled=${entry.enabled} navigation=${entry.navigation}`
    );
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[registry] invalid - ${message}`);
  process.exit(1);
}
