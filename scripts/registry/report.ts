import {
  createClientRegistry,
  getAppOnboardingEntries,
  getClientMatcherEntries,
  getNavigationItems,
  getRegistryEnvTemplate,
  getSmokeTargetEntries,
} from '../../packages/micro-core/src';

const registry = createClientRegistry();

console.log('[registry] navigation');
console.log(JSON.stringify(getNavigationItems(registry), null, 2));

console.log('\n[registry] matcher');
console.log(JSON.stringify(getClientMatcherEntries(registry), null, 2));

console.log('\n[registry] env template');
console.log(getRegistryEnvTemplate());

console.log('\n[registry] onboarding');
console.log(JSON.stringify(getAppOnboardingEntries(), null, 2));

console.log('\n[registry] smoke targets');
console.log(JSON.stringify(getSmokeTargetEntries(), null, 2));
