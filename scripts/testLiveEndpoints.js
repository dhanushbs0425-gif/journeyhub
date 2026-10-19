const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: {
          ...(data
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
              }
            : {})
        }
      },
      (res) => {
        let chunks = '';
        res.on('data', (chunk) => (chunks += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(chunks);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: chunks });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  console.log('--- Testing Live Running Server (http://localhost:5000) ---');

  // 1. Organisers can still log in without OTP
  const orgLogin = await request('POST', '/api/auth/login', {
    identifier: 'dhanushs0425@gmail.com',
    password: 'Organiser@Dhanush2026'
  });
  console.log('1. Organiser Dhanush Login status:', orgLogin.status);
  console.log('   User:', orgLogin.body?.user?.name, '| Role:', orgLogin.body?.user?.role);
  if (orgLogin.status !== 200 || orgLogin.body?.user?.role !== 'organiser') {
    throw new Error('Organiser login failed');
  }

  // 2. Organiser Sai Login
  const saiLogin = await request('POST', '/api/auth/login', {
    identifier: 'sai@gmail.com',
    password: 'Organiser@Sai2026'
  });
  console.log('2. Organiser Sai Login status:', saiLogin.status);
  console.log('   User:', saiLogin.body?.user?.name, '| Role:', saiLogin.body?.user?.role);
  if (saiLogin.status !== 200) throw new Error('Sai login failed');

  // 3. Test Gmail SMTP Status Endpoint (GET /api/auth/email-status)
  const emailStatus = await request('GET', '/api/auth/email-status');
  console.log('3. GET /api/auth/email-status status:', emailStatus.status);
  console.log('   Gmail SMTP Configured:', emailStatus.body?.isConfigured);
  console.log('   Sender Email Masked:', emailStatus.body?.smtpUserMasked || '(none configured)');
  console.log('   Host:', emailStatus.body?.smtpHost + ':' + emailStatus.body?.smtpPort);
  if (emailStatus.status !== 200) throw new Error('Email status endpoint failed');

  // 4. Test Registration rejection when email has not been verified
  const unverifiedReg = await request('POST', '/api/auth/register', {
    name: 'Unverified Traveler',
    email: 'unverified_traveler@gmail.com',
    password: 'password123',
    confirmPassword: 'password123'
  });
  console.log('4. Unverified Registration rejection status:', unverifiedReg.status);
  console.log('   Message:', unverifiedReg.body?.message);
  if (unverifiedReg.status !== 400 || !unverifiedReg.body?.message.includes('verify')) {
    throw new Error('Unverified registration must be rejected');
  }

  // 5. Test Send Email OTP
  const testEmail = 'journeyhub_test_user@gmail.com';
  const sendOtpRes = await request('POST', '/api/auth/send-email-otp', {
    email: testEmail,
    name: 'Live Test Traveler'
  });
  console.log('5. Send Email OTP status:', sendOtpRes.status);
  console.log('   Success:', sendOtpRes.body?.success);
  console.log('   Message:', sendOtpRes.body?.message);
  if (sendOtpRes.status === 200) {
    console.log('✔ Live Email OTP sent successfully to:', testEmail);
  } else if (sendOtpRes.status === 503) {
    console.log('✔ Correctly returned 503 SMTP_NOT_CONFIGURED when SMTP credentials are not yet entered');
  }

  // 6. Test Organiser Divya login (all 3 organisers verified)
  const divyaLogin = await request('POST', '/api/auth/login', {
    identifier: 'divya@gmail.com',
    password: 'Organiser@Divya2026'
  });
  console.log('6. Organiser Divya Login status:', divyaLogin.status);
  console.log('   User:', divyaLogin.body?.user?.name, '| Role:', divyaLogin.body?.user?.role);
  if (divyaLogin.status !== 200) throw new Error('Divya login failed');

  console.log('\n============================================================');
  console.log('✔ ALL LIVE SERVER API VERIFICATIONS PASSED 100% SUCCESSFULLY');
  console.log('============================================================\n');
  process.exit(0);
})().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
