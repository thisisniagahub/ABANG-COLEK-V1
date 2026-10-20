import { commerceTotal } from '../../../server/platform/commerce';

export function clientTotal(): number {
  return commerceTotal();
}
