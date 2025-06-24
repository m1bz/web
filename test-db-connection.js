#!/usr/bin/env node

/**
 * Simple database connection test script
 * Run this to verify your DATABASE_URL is working correctly
 */

const { Client } = require('pg');

async function testConnection() {
  console.log('🔍 Testing database connection...\n');
  
  // Check environment variables
  console.log('Environment check:');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`RENDER: ${process.env.RENDER || 'not set'}`);  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'set (' + process.env.DATABASE_URL.substring(0, 30) + '...)' : 'NOT SET'}`);
  console.log('');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    console.log('Make sure to set it in your Render dashboard under Environment Variables.');
    console.log('Example: postgresql://web_r0ow_user:hgzaoOogVOQZdnayxM3nxYEmOpwUYbIs@dpg-d1de88buibrs73flusf0-a/web_r0ow');
    process.exit(1);
  }

  const connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Render
  };

  const client = new Client(connectionConfig);

  try {
    console.log('🔌 Attempting to connect...');
    await client.connect();
    console.log('✅ Connection successful!');
    
    // Test a simple query
    console.log('🧪 Testing simple query...');
    const result = await client.query('SELECT version();');
    console.log('✅ Query successful!');
    console.log(`Database version: ${result.rows[0].version.substring(0, 50)}...`);
    
    // Check if our tables exist
    console.log('🔍 Checking for application tables...');
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'muscles', 'exercises', 'workouts');
    `);
    
    console.log(`Found ${tableCheck.rows.length} application tables:`, tableCheck.rows.map(r => r.table_name));
    
    if (tableCheck.rows.length === 0) {
      console.log('⚠️  No application tables found. You may need to run the setup script.');
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n🔧 Troubleshooting ENOTFOUND error:');
      console.log('1. Check that your DATABASE_URL hostname is correct');
      console.log('2. Make sure you\'re using the Internal Database URL from Render (not External)');
      console.log('3. Verify the URL format: postgresql://user:password@host:port/database');
    }
    
    if (error.code === '28P01') {
      console.log('\n🔧 Troubleshooting authentication error:');
      console.log('1. Check that your username and password are correct in DATABASE_URL');
      console.log('2. Make sure there are no special characters that need URL encoding');
    }
    
    process.exit(1);
  } finally {
    try {
      await client.end();
      console.log('🔌 Connection closed.');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

testConnection();
