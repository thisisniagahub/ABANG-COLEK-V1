import { httpClient } from '../../src/lib/http/client';

export function sharedHelper(): unknown {
  return httpClient;
}
