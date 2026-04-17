/**
 * Example business service for the activity sub-app.
 *
 * The sub-app owns its API surface: paths, params, return types live here,
 * NOT inside @miro/request-core. The framework only hands us a client.
 */
import {
  createServerRequestClient,
  getBrowserRequestClient,
  type RequestClient,
  type ServerRequestClientOptions,
} from '@miro/request-core';

const APP_NAME = 'activity';

export interface ActivityItem {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
}

function browserClient(): RequestClient {
  return getBrowserRequestClient({
    appName: APP_NAME,
    baseUrl: '/activity/api', // goes through main-app proxy in prod
    defaultTimeoutMs: 10_000,
  });
}

function serverClient(req: ServerRequestClientOptions['req']): RequestClient {
  return createServerRequestClient({
    appName: APP_NAME,
    baseUrl: process.env.ACTIVITY_API_BASE_URL || 'http://activity-backend.internal',
    req,
  });
}

export async function listActivitiesFromBrowser(): Promise<ActivityItem[]> {
  return browserClient().get<ActivityItem[]>('/list');
}

export async function listActivitiesFromServer(
  req: ServerRequestClientOptions['req']
): Promise<ActivityItem[]> {
  return serverClient(req).get<ActivityItem[]>('/list');
}
