// Test Supabase login to verify user exists and is confirmed
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://deljxsvywkbewwsdawqj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbGp4c3Z5d2tiZXd3c2Rhd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzY3MDEsImV4cCI6MjA3NTQ1MjcwMX0.KYm8_S_eIhBCbljCLsqvAd3Zemq5BgJBRXXGThrI4Ts';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  console.log('🔐 Testing login with test@deklaro.com...\n');

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@deklaro.com',
      password: 'Test123456789',
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
      console.error('   Error code:', error.status);
      if (error.message.includes('Email not confirmed')) {
        console.log('\n💡 Run the seed script to confirm user email:');
        console.log('   node scripts/seed-database.js\n');
      }
      process.exit(1);
    } else {
      console.log('✅ Login successful!');
      console.log('   User ID:', data.user?.id);
      console.log('   Email:', data.user?.email);
      console.log('   Email confirmed:', data.user?.email_confirmed_at ? '✅ Yes' : '❌ No');
      console.log('   Session expires:', new Date(data.session?.expires_at * 1000).toLocaleString());

      // Fetch user's tenant memberships
      console.log('\n📋 Fetching tenant memberships...');
      const { data: memberships, error: memberError } = await supabase
        .from('tenant_members')
        .select('*, tenants(*)')
        .eq('userId', data.user.id);

      if (memberError) {
        console.error('❌ Failed to fetch memberships:', memberError.message);
      } else if (memberships.length === 0) {
        console.log('⚠️  No tenant memberships found');
        console.log('   Run seed script to create tenant association:');
        console.log('   node scripts/seed-database.js');
      } else {
        console.log(`✅ Found ${memberships.length} tenant membership(s):`);
        memberships.forEach((m, i) => {
          console.log(`   ${i + 1}. ${m.tenants.name} (${m.role})`);
        });
      }

      console.log('\n✅ Authentication system is working correctly!\n');
    }
  } catch (err) {
    console.error('❌ Network error:', err.message);
    process.exit(1);
  }
}

testLogin();
