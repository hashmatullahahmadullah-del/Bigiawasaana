/**
 * BIGI AWASAANA — Firebase Local Emulator Security Rules Test
 * 
 * To run this test against the official Firebase Local Emulator Suite:
 * 1. Ensure Java (JRE/JDK 11+) is installed.
 * 2. Run: npm install --save-dev @firebase/rules-unit-testing mocha
 * 3. Run: npx firebase emulators:exec --only firestore "npx mocha tests/firestore-emulator-kds.test.mjs"
 */

import { readFileSync } from 'fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = 'bigi-awasaana-7b3ce';

describe('Firestore Security Rules: Kitchen & KDS Isolation', () => {
  let testEnv;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  after(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();

    // Seed test order and settings using privileged admin context
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await doc(db, 'settings/kds').set({ pin: '123456', updatedAt: new Date() });
      await doc(db, 'settings/pickupConfig').set({ enabled: true });
      await doc(db, 'orders/ord_test_1').set({
        id: 'ord_test_1',
        customerName: 'Ahmad Khan',
        customerPhone: '8185551234',
        customerEmail: 'ahmad@example.com',
        cardBrand: 'VISA',
        cardLast4: '4242',
        total: 25.00,
        status: 'pending',
        kdsHidden: false,
        accessToken: 'tok_abc_123',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  });

  // 1. Settings Collection
  it('denies unauthenticated read to settings/kds', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthedDb, 'settings/kds')));
  });

  it('allows unauthenticated read to settings/pickupConfig', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(unauthedDb, 'settings/pickupConfig')));
  });

  it('allows admin read and write to settings/kds', async () => {
    const adminDb = testEnv.authenticatedContext('admin_uid', { email: 'bigiawasaana@gmail.com' }).firestore();
    await assertSucceeds(getDoc(doc(adminDb, 'settings/kds')));
    await assertSucceeds(updateDoc(doc(adminDb, 'settings/kds'), { pin: '654321' }));
  });

  // 2. KDS Order Updates: Legitimate Actions
  it('allows KDS user to transition status pending -> preparing', async () => {
    const kdsDb = testEnv.authenticatedContext('kds_tablet_1', { kds: true }).firestore();
    await assertSucceeds(updateDoc(doc(kdsDb, 'orders/ord_test_1'), {
      status: 'preparing',
      updatedAt: new Date()
    }));
  });

  it('allows KDS user to toggle kdsHidden: true', async () => {
    const kdsDb = testEnv.authenticatedContext('kds_tablet_1', { kds: true }).firestore();
    await assertSucceeds(updateDoc(doc(kdsDb, 'orders/ord_test_1'), {
      kdsHidden: true,
      updatedAt: new Date()
    }));
  });

  // 3. KDS Order Updates: Unauthorized Tampering Rejections
  it('denies KDS user from modifying total or price', async () => {
    const kdsDb = testEnv.authenticatedContext('kds_tablet_1', { kds: true }).firestore();
    await assertFails(updateDoc(doc(kdsDb, 'orders/ord_test_1'), {
      total: 0.00,
      status: 'preparing'
    }));
  });

  it('denies KDS user from modifying customer phone or email', async () => {
    const kdsDb = testEnv.authenticatedContext('kds_tablet_1', { kds: true }).firestore();
    await assertFails(updateDoc(doc(kdsDb, 'orders/ord_test_1'), {
      customerPhone: '0000000000',
      status: 'preparing'
    }));
  });

  it('denies KDS user from modifying accessToken', async () => {
    const kdsDb = testEnv.authenticatedContext('kds_tablet_1', { kds: true }).firestore();
    await assertFails(updateDoc(doc(kdsDb, 'orders/ord_test_1'), {
      accessToken: 'stolen_token',
      status: 'preparing'
    }));
  });

  it('denies KDS user from jumping status backward (ready -> pending)', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), 'orders/ord_test_1'), { status: 'ready' });
    });
    const kdsDb = testEnv.authenticatedContext('kds_tablet_1', { kds: true }).firestore();
    await assertFails(updateDoc(doc(kdsDb, 'orders/ord_test_1'), {
      status: 'pending',
      updatedAt: new Date()
    }));
  });
});
