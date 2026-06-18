// Verify Square application configuration from server-side
const { Client, Environment } = require('square');

const ACCESS_TOKEN = 'EAAAl5_VwspZ8Xk5utOi4prryc1I32wYvR2koctBGisDIl43yZUiFnqOG4V5K1NO';
const APP_ID = 'sq0idp-ZNKswm32xh_nRRecm5ggFg';
const LOCATION_ID = 'LVVN2XC88162M';

const client = new Client({
  environment: Environment.Production,
  accessToken: ACCESS_TOKEN,
});

async function diagnose() {
  console.log('=== Square Configuration Diagnostic ===\n');
  
  // 1. Check Location
  try {
    const { result } = await client.locationsApi.retrieveLocation(LOCATION_ID);
    const loc = result.location;
    console.log('✅ Location Found:');
    console.log(`   Name: ${loc.name}`);
    console.log(`   ID: ${loc.id}`);
    console.log(`   Status: ${loc.status}`);
    console.log(`   Country: ${loc.country}`);
    console.log(`   Currency: ${loc.currency}`);
    console.log(`   Capabilities: ${JSON.stringify(loc.capabilities)}`);
    
    if (!loc.capabilities || !loc.capabilities.includes('CREDIT_CARD_PROCESSING')) {
      console.log('\n❌ PROBLEM: Location does NOT have CREDIT_CARD_PROCESSING capability!');
      console.log('   You need to enable credit card processing for this location in Square Dashboard.');
    } else {
      console.log('\n✅ Location HAS credit card processing capability');
    }
  } catch (err) {
    console.log(`❌ Location retrieval FAILED: ${err.message}`);
    if (err.errors) err.errors.forEach(e => console.log(`   ${e.category}: ${e.code} - ${e.detail}`));
  }

  // 2. Try a test payment with a fake nonce to see the specific error
  console.log('\n--- Testing Payment API with fake token ---');
  try {
    const { result } = await client.paymentsApi.createPayment({
      sourceId: 'cnon:card-nonce-ok',  // Square sandbox test nonce
      idempotencyKey: `test-${Date.now()}`,
      amountMoney: { amount: BigInt(100), currency: 'USD' },
      locationId: LOCATION_ID,
    });
    console.log('✅ Test payment succeeded (unexpected in production with test nonce)');
  } catch (err) {
    if (err.errors) {
      err.errors.forEach(e => {
        console.log(`   ${e.category}: ${e.code}`);
        console.log(`   Detail: ${e.detail}`);
      });
      
      const codes = err.errors.map(e => e.code);
      if (codes.includes('NOT_FOUND') || codes.includes('INVALID_VALUE')) {
        console.log('\n✅ Payment API responded (test nonce rejected as expected in production)');
        console.log('   This means your access token and location ID are valid.');
      } else if (codes.includes('UNAUTHORIZED') || codes.includes('FORBIDDEN')) {
        console.log('\n❌ PROBLEM: Access token is UNAUTHORIZED or payment processing is DISABLED');
        console.log('   Check Square Dashboard > Application > OAuth permissions');
      }
    } else {
      console.log(`   Error: ${err.message}`);
    }
  }

  // 3. Check merchant info
  console.log('\n--- Checking Merchant Info ---');
  try {
    const { result } = await client.merchantsApi.listMerchants();
    if (result.merchant) {
      result.merchant.forEach(m => {
        console.log(`   Merchant: ${m.businessName}`);
        console.log(`   Country: ${m.country}`);
        console.log(`   Status: ${m.status}`);
      });
    }
  } catch (err) {
    console.log(`   Merchant check: ${err.message}`);
  }

  console.log('\n=== Diagnostic Complete ===');
  console.log('\nIf all checks passed, the issue is likely:');
  console.log('1. Domain not added to Square Developer Dashboard > Web Payments SDK > Allowed Domains');
  console.log('2. Go to: https://developer.squareup.com/apps');
  console.log('3. Select your application');
  console.log('4. Go to "Web Payments SDK" in the left sidebar');
  console.log('5. Add these domains:');
  console.log('   - bigiawasaana.com');
  console.log('   - www.bigiawasaana.com');
  console.log('   - bigi-awasaana-7b3ce.web.app');
}

diagnose();
