import { httpClient } from '@client/lib/http/client';

export function sharedHelper(): unknown {
  return httpClient;
}
