import { expect, test } from 'bun:test';
import { PlatformStore } from '../../server/platform/store';
import { Auth } from '../../server/platform/auth';
import { Operations } from '../../server/platform/operations';
import { Commerce } from '../../server/platform/commerce';
import { Work } from '../../server/platform/work';

test('approval reconciliation disimpan bersama audit dan revision lama ditolak', async () => {
 const store = new PlatformStore(':memory:');
 try {
  const auth = new Auth(store, 'test-bootstrap-token-long-enough');
  const login = await auth.authenticate('bootstrap', {email:'approval@example.test',name:'Owner',password:'strong local test password',token:'test-bootstrap-token-long-enough'});
  const actor = auth.resolve(new Request('http://localhost', {headers:{Cookie:login.cookies[0].split(';')[0]}}));
  const commerce = new Commerce(store, auth);
  const ops = new Operations(store, auth, commerce, new Work(store, auth, commerce));
  const record = ops.reconcile(actor,{period:'test',paymentRefs:[],expenseRefs:[]});
  const result = ops.approveReconciliation(actor,record.id,{expectedRevision:1});
  expect(store.get<typeof result>('reconciliations',record.id)).toEqual(result);
  expect(result.status).toBe('approved');
  expect(store.db.query('SELECT * FROM audit WHERE operation=? AND entity_id=?').all('reconciliation.approve',record.id)).toHaveLength(1);
  expect(()=>ops.approveReconciliation(actor,record.id,{expectedRevision:1})).toThrow();
 } finally {store.close();}
});
