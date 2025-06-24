#!/usr/bin/env node

/**
 * URL Format Tester - helps debug PostgreSQL connection string issues
 */

const { Client } = require('pg');

const testUrls = [
  // Your original URL (missing port)
  'postgresql://web_r0ow_user:hgzaoOogVOQZdnayxM3nxYEmOpwUYbIs@dpg-d1de88buibrs73flusf0-a/web_r0ow',
  
  // Corrected URL with port
  'postgresql://web_r0ow_user:hgzaoOogVOQZdnayxM3nxYEmOpwUYbIs@dpg-d1de88buibrs73flusf0-a:5432/web_r0ow',
  
  // Alternative format (postgres vs postgresql)
  'postgres://web_r0ow_user:hgzaoOogVOQZdnayxM3nxYEmOpwUYbIs@dpg-d1de88buibrs73flusf0-a:5432/web_r0ow'
];

async function testUrl(connectionString, index) {
  console.log(`\n🧪 Test ${index + 1}: Testing connection string...`);
  console.log(`URL: ${connectionString.substring(0, 50)}...`);
  
  try {
    // First, test URL parsing
    const url = new URL(connectionString);
    console.log(`✅ URL parsing successful:`);
    console.log(`   Protocol: ${url.protocol}`);
    console.log(`   Hostname: ${url.hostname}`);
    console.log(`   Port: ${url.port || 'default (5432)'}`);
    console.log(`   Database: ${url.pathname.substring(1)}`);
    console.log(`   Username: ${url.username}`);
    
    // Then test actual connection
    const client = new Client({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false }
    });
    
    console.log(`🔌 Attempting connection...`);
    await client.connect();
    console.log(`✅ Connection successful!`);
    
    // Test a simple query
    const result = await client.query('SELECT version();');
    console.log(`✅ Query successful!`);
    
    await client.end();
    console.log(`✅ This URL works! Use this one in your Render environment variables.`);
    return true;
    
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    if (error.code) {
      console.log(`   Error code: ${error.code}`);
    }
    return false;
  }
}

async function runTests() {
  console.log('🔍 Testing different PostgreSQL URL formats...\n');
  
  let workingUrl = null;
  
  for (let i = 0; i < testUrls.length; i++) {
    const success = await testUrl(testUrls[i], i);
    if (success && !workingUrl) {
      workingUrl = testUrls[i];
    }
  }
  
  console.log('\n' + '='.repeat(60));
  if (workingUrl) {
    console.log('🎉 SOLUTION FOUND!');
    console.log('\nSet this as your DATABASE_URL in Render:');
    console.log(`${workingUrl}`);
  } else {
    console.log('❌ No working URL found. Please check:');
    console.log('1. Your database credentials are correct');
    console.log('2. Your database is running and accessible');
    console.log('3. You\'re using the Internal Database URL from Render');
  }
}

runTests().catch(console.error);
