#!/usr/bin/env node

/**
 * Quick test for the exact URL provided
 */

const { Client } = require('pg');

const DATABASE_URL = 'postgresql://web_r0ow_user:hgzaoOogVOQZdnayxM3nxYEmOpwUYbIs@dpg-d1de88buibrs73flusf0-a/web_r0ow';

async function testConnection() {
  console.log('🔍 Testing exact URL provided by user...');
  console.log(`URL: ${DATABASE_URL}`);
  
  try {
    // Test URL parsing first
    console.log('\n📋 URL Analysis:');
    const url = new URL(DATABASE_URL);
    console.log(`   Protocol: ${url.protocol}`);
    console.log(`   Hostname: ${url.hostname}`);
    console.log(`   Port: ${url.port || 'default (PostgreSQL will use 5432)'}`);
    console.log(`   Database: ${url.pathname.substring(1)}`);
    console.log(`   Username: ${url.username}`);
    
    // Test connection
    console.log('\n🔌 Testing connection...');
    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    console.log('✅ Connection successful!');
    
    // Test query
    console.log('🧪 Testing query...');
    const result = await client.query('SELECT version();');
    console.log('✅ Query successful!');
    console.log(`Database: ${result.rows[0].version.substring(0, 60)}...`);
    
    await client.end();
    
    console.log('\n🎉 SUCCESS! This URL works perfectly.');
    console.log('Use this exact URL in your Render environment variables:');
    console.log(`DATABASE_URL=${DATABASE_URL}`);
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n🔧 ENOTFOUND suggests the hostname cannot be resolved.');
      console.log('This might mean:');
      console.log('1. The hostname is incorrect');
      console.log('2. You need to be connected to the internet');
      console.log('3. The database server is not accessible from your location');
    }
    
    process.exit(1);
  }
}

testConnection();
