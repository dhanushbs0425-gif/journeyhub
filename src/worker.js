/**
 * JourneyHub Cloudflare Worker Entry Point
 * Unifies Cloudflare Edge Static Asset Delivery, Direct Serverless Resend OTP & MongoDB Atlas Verification,
 * Serverless Registration & Login, and seamless fallback proxy to the Render backend for remaining APIs.
 */

import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Global protection against uncaught promise rejections from background socket drivers
if (typeof process !== 'undefined' && process.on) {
  process.on('unhandledRejection', (reason) => {
    console.warn('[Worker] Suppressed background unhandled rejection:', reason?.message || reason);
  });
}

/**
 * Execute a scoped database query on a clean, isolated MongoClient connection.
 * Completely eliminates stale TCP sockets, frozen connection pool crashes,
 * and Error 1101 isolate crashes after idle periods.
 */
async function useDb(env, operation) {
  const uri = env.MONGODB_URI;
  if (!uri) throw new Error('Database service is currently unavailable.');
  const client = new MongoClient(uri, {
    maxPoolSize: 1,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 10000
  });

  try {
    await client.connect();
    const db = client.db('journeyhub');
    return await operation(db);
  } finally {
    try {
      await client.close();
    } catch (_) {}
  }
}

async function isDbHealthy(env) {
  try {
    return await useDb(env, async (db) => {
      await db.command({ ping: 1 });
      return true;
    });
  } catch (err) {
    console.warn('[Worker Health DB Error]:', err.message);
    return false;
  }
}

function getJwtSecret(env) {
  return env.JWT_SECRET || 'journeyhub_capstone_secure_secret_2026';
}

function generateToken(userId, env) {
  return jwt.sign({ id: userId.toString() }, getJwtSecret(env), { expiresIn: '7d' });
}

function extractToken(request) {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const url = new URL(request.url);
  return url.searchParams.get('token');
}

function verifyToken(token, env) {
  if (!token) return null;
  const secrets = [
    getJwtSecret(env),
    'journeyhub_capstone_secure_secret_2026',
    'journeyhub_super_secure_capstone_jwt_secret_key_2026'
  ];
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret);
    } catch (_) {}
  }
  return null;
}

function safeObjectId(id) {
  if (!id) return null;
  if (id instanceof ObjectId) return id;
  try {
    if (typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
      return new ObjectId(id);
    }
  } catch (_) {}
  return id;
}

const GENERIC_PLACEHOLDER_IDS = [
  'photo-1488646953014-85cb44e25828',
  'photo-1493976040374-85c8e12f0c0e',
  'photo-1599661046289-e31897846e41'
];

function isGenericPlaceholder(url) {
  if (!url || typeof url !== 'string') return true;
  return GENERIC_PLACEHOLDER_IDS.some(id => url.includes(id));
}

const DESTINATION_IMAGE_MAP = [
  { keys: ['ooty', 'udhagamandalam', 'nilgiri', 'coonoor'], url: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['goa', 'panaji', 'calangute', 'baga', 'anjuna'], url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['manali', 'solang', 'rohtang', 'kullu'], url: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['munnar', 'idukki', 'eravikulam'], url: 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['jaipur', 'pink city', 'amer fort', 'hawa mahal'], url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['udaipur', 'lake pichola', 'city palace'], url: 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['leh', 'ladakh', 'pangong', 'nubra', 'spiti'], url: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['shimla', 'kufri', 'the ridge'], url: 'https://images.unsplash.com/photo-1597074866923-dc0589150358?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['kerala', 'alleppey', 'kochi', 'cochin', 'kumarakom'], url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['varanasi', 'banaras', 'kashi', 'ganga ghat'], url: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['rishikesh', 'haridwar', 'laxman jhula'], url: 'https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['agra', 'taj mahal'], url: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['hampi', 'vijayanagara', 'tungabhadra'], url: 'https://images.unsplash.com/photo-1620766182966-c6eb5ed2b788?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['coorg', 'kodagu', 'madikeri'], url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['kashmir', 'srinagar', 'gulmarg', 'pahalgam', 'dal lake'], url: 'https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['andaman', 'nicobar', 'havelock', 'radhanagar'], url: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['pondicherry', 'puducherry', 'auroville'], url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['darjeeling', 'ghoom', 'tiger hill'], url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['amritsar', 'golden temple'], url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['mysore', 'mysuru'], url: 'https://images.unsplash.com/photo-1600100397608-f010e427771e?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['bangalore', 'bengaluru'], url: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['mumbai', 'bombay'], url: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80' },
  { keys: ['delhi', 'new delhi'], url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80' }
];

const DEFAULT_TRAVEL_IMAGE = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80';

function resolveDestinationImage(destination, title) {
  const text = `${destination || ''} ${title || ''}`.toLowerCase();
  for (const item of DESTINATION_IMAGE_MAP) {
    if (item.keys.some(k => text.includes(k))) return item.url;
  }
  if (/beach|sea|coast|island|ocean/i.test(text)) return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';
  if (/mountain|trek|hill|peak|valley/i.test(text)) return 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80';
  if (/forest|jungle|wildlife|national park|safari/i.test(text)) return 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1200&q=80';
  return DEFAULT_TRAVEL_IMAGE;
}

export default {
  async fetch(request, env, ctx) {
    const requestId = request.headers.get('X-Request-Id') || ('jh_' + crypto.randomUUID().slice(0, 8));
    try {
      return await handleRequest(request, env, ctx, requestId);
    } catch (fatalErr) {
      console.error(`[Worker Fatal Error ${requestId}]:`, fatalErr);
      return jsonResponse({
        success: false,
        message: fatalErr.message || 'An internal server error occurred while processing your request. Please try again.',
        code: 'WORKER_INTERNAL_ERROR'
      }, 500, {}, requestId);
    }
  }
};

async function handleRequest(request, env, ctx, requestId) {
  const url = new URL(request.url);

  // 1. CORS Preflight Handling
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With, X-Request-Id',
        'Access-Control-Max-Age': '86400',
        'X-Request-Id': requestId
      }
    });
  }

  // 2. Health & Diagnostics Check
  if (url.pathname === '/api/health') {
    const dbConnected = await isDbHealthy(env);
    return jsonResponse({
      status: 'online',
      platform: 'cloudflare-workers',
      appName: 'JourneyHub',
      version: '2.0.0',
      resendConfigured: Boolean(env.RESEND_API_KEY),
      databaseConnected: Boolean(dbConnected),
      timestamp: new Date().toISOString()
    }, 200, {}, requestId);
  }

  // 3. Email Provider Status Check
  if (url.pathname === '/api/auth/email-status') {
    const apiKey = env.RESEND_API_KEY || '';
    const isResend = Boolean(apiKey && apiKey.startsWith('re_'));
    return jsonResponse({
      success: true,
      provider: isResend ? 'resend' : 'none',
      isConfigured: isResend,
      sender: env.RESEND_FROM || 'JourneyHub <onboarding@resend.dev>',
      apiKeyMasked: isResend ? `${apiKey.slice(0, 6)}••••${apiKey.slice(-4)}` : '(none)'
    }, 200, {}, requestId);
  }

  // 4. Send Email OTP (Direct Serverless Resend Delivery)
  if (url.pathname === '/api/auth/send-email-otp' || url.pathname === '/api/auth/send-otp') {
    if (request.method === 'POST') {
      const apiKey = env.RESEND_API_KEY;
      const dbAvailable = Boolean(env.MONGODB_URI);

      // If either Resend or DB is not configured in Worker, gracefully proxy to Render backend
      if (!apiKey || !dbAvailable) {
        return proxyToBackend(request, env, url, null, requestId);
      }

      try {
        const body = await request.json().catch(() => ({}));
        const email = (body.email || '').trim().toLowerCase();
        const name = (body.name || 'Traveler').trim();

        if (!email || !email.includes('@')) {
          return jsonResponse({ success: false, message: 'Please provide a valid email address.' }, 400, {}, requestId);
        }

        return await useDb(env, async (db) => {
          // Check if user already exists
          const existingUser = await db.collection('users').findOne({ email });
          if (existingUser) {
            return jsonResponse({
              success: false,
              message: 'An account with this email address already exists. Please sign in.'
            }, 400, {}, requestId);
          }

          // Rate limiting / cooldown check (60 seconds)
          const pending = await db.collection('emailverifications').findOne({ email });
          if (pending && pending.resendAvailableAt && new Date(pending.resendAvailableAt) > new Date()) {
            const waitSeconds = Math.ceil((new Date(pending.resendAvailableAt).getTime() - Date.now()) / 1000);
            return jsonResponse({
              success: false,
              message: `An OTP was recently sent. Please wait ${waitSeconds} seconds before requesting a new code.`,
              cooldown: waitSeconds
            }, 429, {}, requestId);
          }

          // Generate cryptographically random 6-digit OTP
          const randomBytes = new Uint32Array(1);
          crypto.getRandomValues(randomBytes);
          const otp = (100000 + (randomBytes[0] % 900000)).toString();
          const hashedOtp = await bcrypt.hash(otp, 10);

          // Dispatch real email via Resend HTTPS REST API
          const from = env.RESEND_FROM || 'JourneyHub <onboarding@resend.dev>';
          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from,
              to: [email],
              subject: `${otp} is your JourneyHub verification code`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 20px; }
                    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
                    .head { background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
                    .body { padding: 32px 24px; color: #1e293b; }
                    .code-box { background: #f0fdfa; border: 2px dashed #0d9488; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }
                    .code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f766e; font-family: monospace; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <div class="head">
                      <h2 style="margin:0;font-size:24px;">JourneyHub</h2>
                    </div>
                    <div class="body">
                      <p>Hello <strong>${name}</strong>,</p>
                      <p>Use the following 6-digit verification code to complete your registration:</p>
                      <div class="code-box">
                        <div class="code">${otp}</div>
                      </div>
                      <p style="font-size:13px;color:#64748b;">This code expires in 5 minutes &bull; Do not share it with anyone.</p>
                    </div>
                  </div>
                </body>
                </html>
              `,
              text: `Hello ${name}, your JourneyHub verification code is: ${otp} (valid for 5 minutes).`
            })
          });

          const resendData = await resendRes.json().catch(() => ({}));
          if (!resendRes.ok) {
            return jsonResponse({
              success: false,
              message: resendData.message || 'Failed to dispatch email via Resend'
            }, 400, {}, requestId);
          }

          // Store verification in MongoDB Atlas with clean request lifecycle
          await db.collection('emailverifications').updateOne(
            { email },
            {
              $set: {
                email,
                name,
                hashedOtp,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
                attempts: 0,
                resendAvailableAt: new Date(Date.now() + 60 * 1000),
                isVerified: false,
                updatedAt: new Date()
              }
            },
            { upsert: true }
          );

          return jsonResponse({
            success: true,
            message: `A 6-digit verification code has been dispatched to ${email} via Resend. Please check your email inbox.`,
            email,
            cooldown: 60
          }, 200, {}, requestId);
        });
      } catch (err) {
        console.error(`[Worker OTP Error ${requestId}]:`, err);
        return jsonResponse({ success: false, message: err.message || 'Error dispatching OTP' }, 500, {}, requestId);
      }
    }
  }

  // 5. Verify Email OTP (Direct Serverless Verification)
  if (url.pathname === '/api/auth/verify-email-otp' || url.pathname === '/api/auth/verify-otp') {
    if (request.method === 'POST') {
      const dbAvailable = Boolean(env.MONGODB_URI);
      if (!dbAvailable) {
        return proxyToBackend(request, env, url, null, requestId);
      }

      try {
        const body = await request.json().catch(() => ({}));
        const email = (body.email || '').trim().toLowerCase();
        const otp = (body.otp || '').toString().trim();

        if (!email || otp.length !== 6) {
          return jsonResponse({ success: false, message: 'Please provide email and 6-digit verification code.' }, 400, {}, requestId);
        }

        return await useDb(env, async (db) => {
          const pending = await db.collection('emailverifications').findOne({ email });
          if (!pending) {
            return jsonResponse({ success: false, message: 'No pending verification found. Please click "Send OTP" first.' }, 400, {}, requestId);
          }

          if (new Date(pending.expiresAt) < new Date()) {
            return jsonResponse({ success: false, message: 'Verification code has expired. Please request a new code.' }, 400, {}, requestId);
          }

          if (pending.attempts >= 5) {
            return jsonResponse({ success: false, message: 'Too many incorrect attempts. Please request a fresh code.' }, 429, {}, requestId);
          }

          const isMatch = await bcrypt.compare(otp, pending.hashedOtp);
          if (!isMatch) {
            await db.collection('emailverifications').updateOne(
              { email },
              { $inc: { attempts: 1 } }
            );
            const remaining = Math.max(0, 4 - pending.attempts);
            return jsonResponse({
              success: false,
              message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            }, 400, {}, requestId);
          }

          // Mark verified
          await db.collection('emailverifications').updateOne(
            { email },
            { $set: { isVerified: true, verifiedAt: new Date() } }
          );

          return jsonResponse({
            success: true,
            message: 'Email address verified successfully!',
            email,
            isVerified: true
          }, 200, {}, requestId);
        });
      } catch (err) {
        console.error(`[Worker Verify OTP Error ${requestId}]:`, err);
        return jsonResponse({ success: false, message: err.message || 'Error verifying OTP' }, 500, {}, requestId);
      }
    }
  }

  // 6. Complete Registration (Direct Serverless Registration without OTP)
  if (url.pathname === '/api/auth/register' && request.method === 'POST') {
    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      const body = await request.json().catch(() => ({}));
      const name = (body.name || '').trim();
      const email = (body.email || '').trim().toLowerCase();
      const phone = (body.phone || '').trim();
      const password = body.password || '';
      const confirmPassword = body.confirmPassword;

      if (!name || name.length < 2) {
        return jsonResponse({ success: false, message: 'Full name must be at least 2 characters.' }, 400, {}, requestId);
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return jsonResponse({ success: false, message: 'Please provide a valid email address.' }, 400, {}, requestId);
      }
      const phoneDigits = phone.replace(/\D/g, '');
      if (!phone || phoneDigits.length < 10 || phoneDigits.length > 15) {
        return jsonResponse({ success: false, message: 'Please provide a valid 10 to 15 digit mobile phone number.' }, 400, {}, requestId);
      }
      if (!password || password.length < 6) {
        return jsonResponse({ success: false, message: 'Password must be at least 6 characters long.' }, 400, {}, requestId);
      }
      if (confirmPassword !== undefined && password !== confirmPassword) {
        return jsonResponse({ success: false, message: 'Passwords do not match.' }, 400, {}, requestId);
      }

      return await useDb(env, async (db) => {
        // Duplicate email check
        const existingEmailUser = await db.collection('users').findOne({ email });
        if (existingEmailUser) {
          return jsonResponse({
            success: false,
            message: 'An account with this email address already exists. Please log in.'
          }, 400, {}, requestId);
        }

        // Duplicate mobile phone number check
        const phoneLast10 = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits;
        const phonePattern = phoneLast10.split('').join('[\\s-]*');
        const existingPhoneUser = await db.collection('users').findOne({
          $or: [
            { phone },
            { phone: { $regex: new RegExp(phonePattern + '$') } },
            { 'profile.phone': phone },
            { 'profile.phone': { $regex: new RegExp(phonePattern + '$') } }
          ]
        });
        if (existingPhoneUser) {
          return jsonResponse({
            success: false,
            message: 'An account with this mobile phone number already exists. Please log in.'
          }, 400, {}, requestId);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
          name,
          email,
          phone,
          password: hashedPassword,
          role: 'user',
          emailVerified: true,
          phoneVerified: true,
          verificationMethod: 'password',
          status: 'active',
          profile: {
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
            phone,
            bio: 'Passionate globetrotter exploring new horizons.',
            homeCity: '',
            budgetPreference: 'Moderate',
            preferredCategories: []
          },
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
          preferences: {
            currency: 'INR',
            budgetAlertThreshold: 80,
            emailNotifications: true,
            theme: 'navy'
          },
          travelInterests: [],
          emergencyContact: { name: '', relationship: '', phone: '' },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await db.collection('users').insertOne(newUser);
        const token = generateToken(result.insertedId, env);

        return jsonResponse({
          success: true,
          message: 'Registration successful! Welcome to JourneyHub.',
          token,
          user: {
            _id: result.insertedId.toString(),
            name,
            email,
            phone,
            role: 'user',
            avatar: newUser.avatar,
            profile: newUser.profile
          }
        }, 201, {}, requestId);
      });
    } catch (err) {
      console.error(`[Worker Registration Error ${requestId}]:`, err);
      return jsonResponse({ success: false, message: err.message || 'Registration failed' }, 500, {}, requestId);
    }
  }

  // 7. Login (Direct Serverless Authentication via Email or Mobile Phone Number + Password)
  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      const body = await request.json().catch(() => ({}));
      const loginTarget = ((body.identifier || body.email || body.phone || '')).toString().trim();
      const password = body.password || '';

      if (!loginTarget || !password) {
        return jsonResponse({ success: false, message: 'Please enter your email or mobile phone number, and your password.' }, 400, {}, requestId);
      }

      return await useDb(env, async (db) => {
        const lower = loginTarget.toLowerCase();
        let user = null;

        // 1. By email
        if (lower.includes('@')) {
          user = await db.collection('users').findOne({ email: lower });
        }

        // 2. By mobile phone number
        if (!user) {
          const phoneDigits = loginTarget.replace(/\D/g, '');
          if (phoneDigits.length >= 10) {
            const phoneLast10 = phoneDigits.slice(-10);
            const phonePattern = phoneLast10.split('').join('[\\s-]*');
            user = await db.collection('users').findOne({
              $or: [
                { phone: loginTarget },
                { phone: { $regex: new RegExp(phonePattern + '$') } },
                { 'profile.phone': loginTarget },
                { 'profile.phone': { $regex: new RegExp(phonePattern + '$') } }
              ]
            });
          }
        }

        // 3. Fallback: check organiser name or email prefix
        if (!user) {
          user = await db.collection('users').findOne({
            $or: [
              { email: lower },
              {
                role: 'organiser',
                name: { $regex: new RegExp(`^${lower}$`, 'i') }
              }
            ]
          });
        }

        if (!user) {
          return jsonResponse({ success: false, message: 'Invalid email, mobile phone number, or password.' }, 401, {}, requestId);
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return jsonResponse({ success: false, message: 'Invalid email, mobile phone number, or password.' }, 401, {}, requestId);
        }

        const token = generateToken(user._id, env);

        return jsonResponse({
          success: true,
          message: 'Login successful.',
          token,
          user: {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone || user.profile?.phone || '',
            role: user.role,
            emailVerified: user.emailVerified,
            avatar: user.avatar || user.profile?.avatar,
            profile: user.profile,
            preferences: user.preferences
          }
        }, 200, {}, requestId);
      });
    } catch (err) {
      console.error(`[Worker Login Error ${requestId}]:`, err);
      return jsonResponse({ success: false, message: err.message || 'Login error' }, 500, {}, requestId);
    }
  }

  // 8. Authenticated Current User Profile (Direct Edge Session Hydration)
  if (url.pathname === '/api/auth/me' && request.method === 'GET') {
    const token = extractToken(request);
    if (!token) {
      return jsonResponse({ success: false, message: 'Authentication required. Please log in.' }, 401, {}, requestId);
    }

    const decoded = verifyToken(token, env);
    if (!decoded || !decoded.id) {
      return jsonResponse({ success: false, message: 'Invalid or expired session token. Please log in again.' }, 401, {}, requestId);
    }

    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      return await useDb(env, async (db) => {
        let user = null;
        try {
          user = await db.collection('users').findOne({ _id: new ObjectId(decoded.id) });
        } catch (_) {
          user = await db.collection('users').findOne({ _id: decoded.id });
        }

        if (!user) {
          return jsonResponse({ success: false, message: 'The user belonging to this token no longer exists.' }, 401, {}, requestId);
        }

        return jsonResponse({
          success: true,
          user: {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone || user.profile?.phone || '',
            role: user.role,
            emailVerified: Boolean(user.emailVerified),
            avatar: user.avatar || user.profile?.avatar,
            profile: user.profile,
            preferences: user.preferences
          }
        }, 200, {}, requestId);
      });
    } catch (err) {
      console.error(`[Worker /api/auth/me Error ${requestId}]:`, err);
      return jsonResponse({ success: false, message: err.message || 'Error fetching user profile' }, 500, {}, requestId);
    }
  }

  // 9. Logout (Direct Edge Session Termination)
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    return jsonResponse({
      success: true,
      message: 'Logged out successfully.'
    }, 200, {}, requestId);
  }

  // 10. Notifications Count & List (Direct Edge Notification Hydration)
  if (url.pathname === '/api/notifications' && request.method === 'GET') {
    const token = extractToken(request);
    if (!token) {
      return jsonResponse({ success: false, message: 'Authentication required. Please log in.' }, 401, {}, requestId);
    }
    const decoded = verifyToken(token, env);
    if (!decoded || !decoded.id) {
      return jsonResponse({ success: false, message: 'Invalid or expired session token.' }, 401, {}, requestId);
    }

    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      return await useDb(env, async (db) => {
        let userObjId = null;
        try { userObjId = new ObjectId(decoded.id); } catch (_) {}

        const query = userObjId
          ? { $or: [{ user: userObjId }, { user: decoded.id }, { userId: userObjId }, { userId: decoded.id }] }
          : { $or: [{ user: decoded.id }, { userId: decoded.id }] };

        const notifications = await db.collection('notifications')
          .find(query)
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray();

        const unreadCount = await db.collection('notifications').countDocuments({
          ...query,
          isRead: false
        });

        return jsonResponse({
          success: true,
          unreadCount,
          notifications: notifications.map(n => ({ ...n, _id: n._id.toString() }))
        }, 200, {}, requestId);
      });
    } catch (err) {
      console.error(`[Worker Notifications Error ${requestId}]:`, err);
      return jsonResponse({ success: true, unreadCount: 0, notifications: [] }, 200, {}, requestId);
    }
  }

  // 11. Wishlist (Direct Edge Wishlist Hydration)
  if (url.pathname === '/api/wishlist' && request.method === 'GET') {
    const token = extractToken(request);
    if (!token) {
      return jsonResponse({ success: false, message: 'Authentication required. Please log in.' }, 401, {}, requestId);
    }
    const decoded = verifyToken(token, env);
    if (!decoded || !decoded.id) {
      return jsonResponse({ success: false, message: 'Invalid or expired session token.' }, 401, {}, requestId);
    }

    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      return await useDb(env, async (db) => {
        let userObjId = null;
        try { userObjId = new ObjectId(decoded.id); } catch (_) {}

        const query = userObjId
          ? { $or: [{ userId: userObjId }, { userId: decoded.id }, { user: userObjId }, { user: decoded.id }] }
          : { $or: [{ userId: decoded.id }, { user: decoded.id }] };

        const items = await db.collection('wishlists')
          .find(query)
          .sort({ addedAt: -1 })
          .toArray();

        return jsonResponse({
          success: true,
          count: items.length,
          wishlistIds: items.map(i => (i.destinationId || '').toString()),
          destinations: items.map(i => ({ ...i, _id: i._id.toString() }))
        }, 200, {}, requestId);
      });
    } catch (err) {
      console.error(`[Worker Wishlist Error ${requestId}]:`, err);
      return jsonResponse({ success: true, count: 0, wishlistIds: [], destinations: [] }, 200, {}, requestId);
    }
  }

  // 12. Join Requests - Organiser Clear All (Direct Edge Execution)
  if (url.pathname === '/api/join-requests/clear-all' && request.method === 'DELETE') {
    const token = extractToken(request);
    if (!token) {
      return jsonResponse({ success: false, message: 'Authentication required. Please log in.' }, 401, {}, requestId);
    }
    const decoded = verifyToken(token, env);
    if (!decoded || !decoded.id) {
      return jsonResponse({ success: false, message: 'Invalid or expired session token.' }, 401, {}, requestId);
    }

    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      return await useDb(env, async (db) => {
        const userObjId = safeObjectId(decoded.id);
        const user = await db.collection('users').findOne({ _id: userObjId });
        if (!user || !['organiser', 'organizer', 'admin'].includes((user.role || '').toLowerCase())) {
          return jsonResponse({ success: false, message: 'Access denied: Only organisers can clear join requests.' }, 403, {}, requestId);
        }

        const myTrips = await db.collection('trips').find({
          $or: [{ organiserId: userObjId }, { createdBy: userObjId }, { organiserId: decoded.id }, { createdBy: decoded.id }]
        }).project({ _id: 1 }).toArray();
        const myTripIds = myTrips.map(t => t._id);

        const myMysteryTrips = await db.collection('mysterytrips').find({
          $or: [{ organiserId: userObjId }, { organiserId: decoded.id }]
        }).project({ _id: 1 }).toArray();
        const myMysteryTripIds = myMysteryTrips.map(t => t._id);

        const filter = {
          $or: [
            { organiser: userObjId },
            { organiser: decoded.id },
            { trip: { $in: myTripIds } },
            { mysteryTrip: { $in: myMysteryTripIds } }
          ]
        };

        const result = await db.collection('joinrequests').deleteMany(filter);
        return jsonResponse({
          success: true,
          message: `Successfully cleared ${result.deletedCount || 0} join requests for your expeditions.`,
          clearedCount: result.deletedCount || 0
        }, 200, {}, requestId);
      });
    } catch (err) {
      console.error(`[Worker Clear All Error ${requestId}]:`, err);
      return jsonResponse({ success: false, message: err.message || 'Error clearing requests' }, 500, {}, requestId);
    }
  }

  // 13. Join Requests - Organiser Review Portal List (Direct Edge Aggregation)
  if ((url.pathname === '/api/join-requests/organiser-requests' || url.pathname === '/api/join-requests/organiser/all') && request.method === 'GET') {
    const token = extractToken(request);
    if (!token) {
      return jsonResponse({ success: false, message: 'Authentication required. Please log in.' }, 401, {}, requestId);
    }
    const decoded = verifyToken(token, env);
    if (!decoded || !decoded.id) {
      return jsonResponse({ success: false, message: 'Invalid or expired session token.' }, 401, {}, requestId);
    }

    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      return await useDb(env, async (db) => {
        const userObjId = safeObjectId(decoded.id);
        const user = await db.collection('users').findOne({ _id: userObjId });
        if (!user || !['organiser', 'organizer', 'admin'].includes((user.role || '').toLowerCase())) {
          return jsonResponse({ success: false, message: 'Access denied: Only organisers can view incoming join requests.' }, 403, {}, requestId);
        }

        const rawRequests = await db.collection('joinrequests')
          .find({ status: { $ne: 'cancelled' } })
          .sort({ requestedAt: -1, createdAt: -1 })
          .toArray();

        const userIds = [...new Set(rawRequests.map(r => r.user).filter(Boolean).map(id => id.toString()))];
        const tripIds = [...new Set(rawRequests.map(r => r.trip).filter(Boolean).map(id => id.toString()))];
        const mysteryTripIds = [...new Set(rawRequests.map(r => r.mysteryTrip).filter(Boolean).map(id => id.toString()))];
        const revIds = [...new Set(rawRequests.map(r => r.reviewedBy).filter(Boolean).map(id => id.toString()))];
        const orgIds = [...new Set(rawRequests.map(r => r.organiser).filter(Boolean).map(id => id.toString()))];

        const [usersList, tripsList, mysteryList, revList, orgList] = await Promise.all([
          db.collection('users').find({ _id: { $in: userIds.map(safeObjectId) } }).toArray(),
          db.collection('trips').find({ _id: { $in: tripIds.map(safeObjectId) } }).toArray(),
          db.collection('mysterytrips').find({ _id: { $in: mysteryTripIds.map(safeObjectId) } }).toArray(),
          db.collection('users').find({ _id: { $in: revIds.map(safeObjectId) } }).toArray(),
          db.collection('users').find({ _id: { $in: orgIds.map(safeObjectId) } }).toArray()
        ]);

        const userMap = new Map(usersList.map(u => [u._id.toString(), u]));
        const tripMap = new Map(tripsList.map(t => [t._id.toString(), t]));
        const mysteryMap = new Map(mysteryList.map(m => [m._id.toString(), m]));
        const revMap = new Map(revList.map(r => [r._id.toString(), r]));
        const orgMap = new Map(orgList.map(o => [o._id.toString(), o]));

        const requests = rawRequests.map(r => {
          const traveler = userMap.get((r.user || '').toString());
          const trip = tripMap.get((r.trip || '').toString());
          const mysteryTrip = mysteryMap.get((r.mysteryTrip || '').toString());
          const reviewer = revMap.get((r.reviewedBy || '').toString());
          const org = orgMap.get((r.organiser || '').toString());

          return {
            _id: r._id.toString(),
            tripType: r.tripType || (mysteryTrip ? 'mystery' : 'normal'),
            trip: trip ? {
              _id: trip._id.toString(),
              title: trip.title,
              destination: trip.destination,
              startDate: trip.startDate,
              endDate: trip.endDate,
              price: trip.price || trip.estimatedBudget,
              currency: trip.currency || 'INR',
              availableSeats: trip.availableSeats !== undefined ? trip.availableSeats : (trip.capacity || 10),
              capacity: trip.capacity || 10,
              coverImage: (trip.coverImage && !isGenericPlaceholder(trip.coverImage)) ? trip.coverImage : resolveDestinationImage(trip.destination, trip.title),
              status: trip.status || 'upcoming',
              organiserId: trip.organiserId ? trip.organiserId.toString() : ''
            } : (r.trip ? { _id: r.trip.toString() } : undefined),
            mysteryTrip: mysteryTrip ? {
              _id: mysteryTrip._id.toString(),
              title: mysteryTrip.title,
              destinationHint: mysteryTrip.destinationHint,
              destinationSecret: mysteryTrip.destinationSecret,
              departureDate: mysteryTrip.departureDate,
              returnDate: mysteryTrip.returnDate,
              price: mysteryTrip.price,
              currency: mysteryTrip.currency || 'INR',
              availableSeats: mysteryTrip.availableSeats !== undefined ? mysteryTrip.availableSeats : (mysteryTrip.maxParticipants || 10),
              maxParticipants: mysteryTrip.maxParticipants || 10,
              coverImage: mysteryTrip.coverImage,
              isRevealed: Boolean(mysteryTrip.isRevealed),
              status: mysteryTrip.status || 'published'
            } : undefined,
            user: traveler ? {
              _id: traveler._id.toString(),
              name: traveler.name,
              email: traveler.email,
              avatar: traveler.avatar || traveler.profile?.avatar,
              phone: traveler.phone || traveler.profile?.phone,
              bio: traveler.profile?.bio
            } : { _id: (r.user || '').toString(), name: 'Traveler' },
            organiser: org ? { _id: org._id.toString(), name: org.name, email: org.email, avatar: org.avatar } : (r.organiser ? { _id: r.organiser.toString() } : undefined),
            reviewedBy: reviewer ? { _id: reviewer._id.toString(), name: reviewer.name, email: reviewer.email } : undefined,
            seatsRequested: r.seatsRequested || 1,
            status: r.status || 'pending',
            message: r.message || '',
            rejectionReason: r.rejectionReason || '',
            requestedAt: r.requestedAt || r.createdAt,
            reviewedAt: r.reviewedAt
          };
        });

        return jsonResponse({
          success: true,
          count: requests.length,
          pendingCount: requests.filter(r => r.status === 'pending').length,
          approvedCount: requests.filter(r => r.status === 'approved').length,
          rejectedCount: requests.filter(r => r.status === 'rejected').length,
          requests
        }, 200, {}, requestId);
      });
    } catch (err) {
      console.error(`[Worker Organiser Requests Error ${requestId}]:`, err);
      return jsonResponse({ success: false, message: err.message || 'Error fetching organiser requests' }, 500, {}, requestId);
    }
  }

  // 14. Join Requests - Traveler My Requests List (Direct Edge Aggregation)
  if ((url.pathname === '/api/join-requests/my-requests' || url.pathname === '/api/join-requests') && request.method === 'GET') {
    const token = extractToken(request);
    if (!token) {
      return jsonResponse({ success: false, message: 'Authentication required. Please log in.' }, 401, {}, requestId);
    }
    const decoded = verifyToken(token, env);
    if (!decoded || !decoded.id) {
      return jsonResponse({ success: false, message: 'Invalid or expired session token.' }, 401, {}, requestId);
    }

    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      return await useDb(env, async (db) => {
        const userObjId = safeObjectId(decoded.id);
        const rawRequests = await db.collection('joinrequests')
          .find({
            $or: [{ user: userObjId }, { user: decoded.id }],
            status: { $ne: 'cancelled' }
          })
          .sort({ requestedAt: -1, createdAt: -1 })
          .toArray();

        const tripIds = [...new Set(rawRequests.map(r => r.trip).filter(Boolean).map(id => id.toString()))];
        const mysteryTripIds = [...new Set(rawRequests.map(r => r.mysteryTrip).filter(Boolean).map(id => id.toString()))];
        const orgIds = [...new Set(rawRequests.map(r => r.organiser).filter(Boolean).map(id => id.toString()))];

        const [tripsList, mysteryList, orgList] = await Promise.all([
          db.collection('trips').find({ _id: { $in: tripIds.map(safeObjectId) } }).toArray(),
          db.collection('mysterytrips').find({ _id: { $in: mysteryTripIds.map(safeObjectId) } }).toArray(),
          db.collection('users').find({ _id: { $in: orgIds.map(safeObjectId) } }).toArray()
        ]);

        const tripMap = new Map(tripsList.map(t => [t._id.toString(), t]));
        const mysteryMap = new Map(mysteryList.map(m => [m._id.toString(), m]));
        const orgMap = new Map(orgList.map(o => [o._id.toString(), o]));

        const requests = rawRequests.map(r => {
          const trip = tripMap.get((r.trip || '').toString());
          const mysteryTrip = mysteryMap.get((r.mysteryTrip || '').toString());
          const org = orgMap.get((r.organiser || '').toString());

          return {
            _id: r._id.toString(),
            tripType: r.tripType || (mysteryTrip ? 'mystery' : 'normal'),
            trip: trip ? {
              _id: trip._id.toString(),
              title: trip.title,
              destination: trip.destination,
              startDate: trip.startDate,
              endDate: trip.endDate,
              price: trip.price || trip.estimatedBudget,
              currency: trip.currency || 'INR',
              availableSeats: trip.availableSeats !== undefined ? trip.availableSeats : (trip.capacity || 10),
              capacity: trip.capacity || 10,
              coverImage: (trip.coverImage && !isGenericPlaceholder(trip.coverImage)) ? trip.coverImage : resolveDestinationImage(trip.destination, trip.title),
              status: trip.status || 'upcoming'
            } : undefined,
            mysteryTrip: mysteryTrip ? {
              _id: mysteryTrip._id.toString(),
              title: mysteryTrip.title,
              destinationHint: mysteryTrip.destinationHint,
              destinationSecret: mysteryTrip.isRevealed ? mysteryTrip.destinationSecret : null,
              departureDate: mysteryTrip.departureDate,
              returnDate: mysteryTrip.returnDate,
              price: mysteryTrip.price,
              currency: mysteryTrip.currency || 'INR',
              availableSeats: mysteryTrip.availableSeats,
              maxParticipants: mysteryTrip.maxParticipants,
              coverImage: mysteryTrip.coverImage,
              status: mysteryTrip.status,
              isRevealed: Boolean(mysteryTrip.isRevealed)
            } : undefined,
            organiser: org ? { _id: org._id.toString(), name: org.name, email: org.email, avatar: org.avatar } : undefined,
            seatsRequested: r.seatsRequested || 1,
            status: r.status || 'pending',
            message: r.message || '',
            rejectionReason: r.rejectionReason || '',
            requestedAt: r.requestedAt || r.createdAt,
            reviewedAt: r.reviewedAt
          };
        });

        return jsonResponse({
          success: true,
          count: requests.length,
          requests
        }, 200, {}, requestId);
      });
    } catch (err) {
      console.error(`[Worker My Requests Error ${requestId}]:`, err);
      return jsonResponse({ success: false, message: err.message || 'Error fetching user requests' }, 500, {}, requestId);
    }
  }

  // 15. Submit Join Request (POST /api/trips/:tripId/join-requests or /api/join-requests)
  const joinPostMatch = url.pathname.match(/^\/api\/trips\/([^\/]+)\/join-requests$/) ||
                        url.pathname.match(/^\/api\/join-requests(?:\/([^\/]+))?$/);
  if (joinPostMatch && request.method === 'POST') {
    const token = extractToken(request);
    if (!token) {
      return jsonResponse({ success: false, message: 'Authentication required. Please log in.' }, 401, {}, requestId);
    }
    const decoded = verifyToken(token, env);
    if (!decoded || !decoded.id) {
      return jsonResponse({ success: false, message: 'Invalid or expired session token.' }, 401, {}, requestId);
    }

    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      const body = await request.json().catch(() => ({}));
      const pathTripId = joinPostMatch[1] && joinPostMatch[1] !== 'clear-all' ? joinPostMatch[1] : null;
      const tripId = pathTripId || body.tripId;
      if (!tripId) {
        return jsonResponse({ success: false, message: 'Trip ID is required.' }, 400, {}, requestId);
      }

      const seats = Number(body.seatsRequested || body.seats) || 1;
      const message = (body.message || '').trim() || 'I would like to join this trip!';

      return await useDb(env, async (db) => {
        const userObjId = safeObjectId(decoded.id);
        const user = await db.collection('users').findOne({ _id: userObjId });
        if (!user) {
          return jsonResponse({ success: false, message: 'User account not found.' }, 401, {}, requestId);
        }

        const tripObjId = safeObjectId(tripId);
        let trip = await db.collection('trips').findOne({ _id: tripObjId });
        let isMystery = false;

        if (!trip) {
          trip = await db.collection('mysterytrips').findOne({ _id: tripObjId });
          if (trip) isMystery = true;
        }

        if (!trip) {
          return jsonResponse({ success: false, message: 'Trip not found.' }, 404, {}, requestId);
        }

        // Prevent organiser joining their own trip
        const tripOrgId = (trip.organiserId || trip.createdBy || '').toString();
        if (tripOrgId && tripOrgId === decoded.id) {
          return jsonResponse({ success: false, message: 'You are the organiser of this trip.' }, 400, {}, requestId);
        }

        // Check if user is already confirmed member
        const existingMember = await db.collection('tripmembers').findOne({
          trip: trip._id,
          user: userObjId,
          status: 'accepted'
        });
        if (existingMember) {
          return jsonResponse({ success: false, message: 'You are already a confirmed traveler on this trip.' }, 400, {}, requestId);
        }

        // Prevent duplicate active requests
        const existingReq = await db.collection('joinrequests').findOne({
          $or: [{ trip: trip._id }, { mysteryTrip: trip._id }],
          user: userObjId,
          status: { $in: ['pending', 'approved'] }
        });
        if (existingReq) {
          return jsonResponse({
            success: false,
            message: `You already have an active (${existingReq.status}) request to join this trip.`
          }, 400, {}, requestId);
        }

        // Check available capacity
        if (trip.availableSeats !== undefined && trip.availableSeats < seats) {
          return jsonResponse({
            success: false,
            message: `Trip capacity exceeded. Only ${trip.availableSeats} seat(s) remaining.`
          }, 400, {}, requestId);
        }

        const organiserId = trip.organiserId || trip.createdBy || null;

        const newDoc = {
          trip: isMystery ? undefined : trip._id,
          mysteryTrip: isMystery ? trip._id : undefined,
          tripType: isMystery ? 'mystery' : 'normal',
          user: userObjId,
          organiser: safeObjectId(organiserId),
          seatsRequested: seats,
          message,
          status: 'pending',
          requestedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await db.collection('joinrequests').insertOne(newDoc);

        // Notify organiser
        if (organiserId) {
          await db.collection('notifications').insertOne({
            user: safeObjectId(organiserId),
            trip: trip._id,
            type: isMystery ? 'mystery_join_request' : 'join_request',
            title: isMystery ? 'New Mystery Traveler Request' : 'New Traveler Join Request',
            message: `${user.name} requested to join "${trip.title}" (${seats} seat${seats > 1 ? 's' : ''}).`,
            link: '#/organiser-requests',
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        return jsonResponse({
          success: true,
          message: 'Your join request has been sent to the organisers for review!',
          request: {
            ...newDoc,
            _id: result.insertedId.toString(),
            user: { _id: user._id.toString(), name: user.name, email: user.email },
            trip: { _id: trip._id.toString(), title: trip.title }
          }
        }, 201, {}, requestId);
      });
    } catch (err) {
      console.error(`[Worker Join Request Submit Error ${requestId}]:`, err);
      return jsonResponse({ success: false, message: err.message || 'Error submitting join request' }, 500, {}, requestId);
    }
  }

  // 16. Organiser Action: Accept / Reject Join Request (PATCH /api/join-requests/:requestId)
  const reqPatchMatch = url.pathname.match(/^\/api\/join-requests\/([a-fA-F0-9]{24})$/);
  if (reqPatchMatch && request.method === 'PATCH') {
    const token = extractToken(request);
    if (!token) {
      return jsonResponse({ success: false, message: 'Authentication required. Please log in.' }, 401, {}, requestId);
    }
    const decoded = verifyToken(token, env);
    if (!decoded || !decoded.id) {
      return jsonResponse({ success: false, message: 'Invalid or expired session token.' }, 401, {}, requestId);
    }

    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      const requestIdParam = reqPatchMatch[1];
      const body = await request.json().catch(() => ({}));
      const { status, rejectionReason } = body;

      if (!['approved', 'rejected'].includes(status)) {
        return jsonResponse({ success: false, message: 'Status must be approved or rejected.' }, 400, {}, requestId);
      }

      return await useDb(env, async (db) => {
        const userObjId = safeObjectId(decoded.id);
        const user = await db.collection('users').findOne({ _id: userObjId });
        if (!user || !['organiser', 'organizer', 'admin'].includes((user.role || '').toLowerCase())) {
          return jsonResponse({ success: false, message: 'Access denied: Only tour organisers can approve or reject join requests.' }, 403, {}, requestId);
        }

        const requestDoc = await db.collection('joinrequests').findOne({ _id: safeObjectId(requestIdParam) });
        if (!requestDoc) {
          return jsonResponse({ success: false, message: 'Join request not found.' }, 404, {}, requestId);
        }

        let trip = null;
        if (requestDoc.trip) {
          trip = await db.collection('trips').findOne({ _id: safeObjectId(requestDoc.trip) });
        } else if (requestDoc.mysteryTrip) {
          trip = await db.collection('mysterytrips').findOne({ _id: safeObjectId(requestDoc.mysteryTrip) });
        }

        // Organiser isolation: only trip owner or assigned organiser or admin
        const isOwner = (requestDoc.organiser && requestDoc.organiser.toString() === decoded.id) ||
          (trip && trip.organiserId && trip.organiserId.toString() === decoded.id) ||
          (trip && trip.createdBy && trip.createdBy.toString() === decoded.id) ||
          (user.role || '').toLowerCase() === 'admin';

        if (!isOwner) {
          return jsonResponse({
            success: false,
            message: 'Access denied: You can only review join requests for trips you organise.'
          }, 403, {}, requestId);
        }

        if (requestDoc.status === status) {
          return jsonResponse({
            success: true,
            message: `Join request is already marked as ${status}.`,
            request: { ...requestDoc, _id: requestDoc._id.toString() }
          }, 200, {}, requestId);
        }

        const seatsNeeded = requestDoc.seatsRequested || 1;
        const travelerId = requestDoc.user;

        if (status === 'approved') {
          if (trip && trip.availableSeats !== undefined && trip.availableSeats < seatsNeeded) {
            return jsonResponse({
              success: false,
              message: `Cannot approve: Trip capacity reached. Only ${trip.availableSeats} seat(s) available, but ${seatsNeeded} requested.`
            }, 400, {}, requestId);
          }

          if (trip && trip.availableSeats !== undefined) {
            const collectionName = requestDoc.mysteryTrip ? 'mysterytrips' : 'trips';
            await db.collection(collectionName).updateOne(
              { _id: trip._id },
              { $inc: { availableSeats: -seatsNeeded } }
            );
          }

          if (requestDoc.trip) {
            await db.collection('tripmembers').updateOne(
              { trip: trip._id, user: safeObjectId(travelerId) },
              {
                $set: { role: 'viewer', status: 'accepted', updatedAt: new Date() },
                $setOnInsert: { createdAt: new Date() }
              },
              { upsert: true }
            );
          }

          await db.collection('notifications').insertOne({
            user: safeObjectId(travelerId),
            trip: trip ? trip._id : undefined,
            type: requestDoc.mysteryTrip ? 'mystery_approved' : 'join_approved',
            title: 'Trip Request Approved! 🎉',
            message: `Your request to join "${trip ? trip.title : 'expedition'}" has been approved! Seat confirmed.`,
            link: requestDoc.mysteryTrip ? '#/mystery-trips' : `#/trips/${trip ? trip._id : ''}`,
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } else if (status === 'rejected') {
          if (requestDoc.status === 'approved' && trip) {
            const collectionName = requestDoc.mysteryTrip ? 'mysterytrips' : 'trips';
            await db.collection(collectionName).updateOne(
              { _id: trip._id },
              { $inc: { availableSeats: seatsNeeded } }
            );
            if (requestDoc.trip) {
              await db.collection('tripmembers').deleteOne({ trip: trip._id, user: safeObjectId(travelerId) });
            }
          }

          await db.collection('notifications').insertOne({
            user: safeObjectId(travelerId),
            trip: trip ? trip._id : undefined,
            type: requestDoc.mysteryTrip ? 'mystery_rejected' : 'join_rejected',
            title: 'Trip Request Update',
            message: `Your request to join "${trip ? trip.title : 'expedition'}" was not accepted.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
            link: '#/my-requests',
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        await db.collection('joinrequests').updateOne(
          { _id: requestDoc._id },
          {
            $set: {
              status,
              rejectionReason: rejectionReason || '',
              reviewedAt: new Date(),
              reviewedBy: userObjId,
              updatedAt: new Date()
            }
          }
        );

        return jsonResponse({
          success: true,
          message: `Join request marked as ${status}.`,
          request: {
            ...requestDoc,
            _id: requestDoc._id.toString(),
            status,
            rejectionReason: rejectionReason || '',
            reviewedAt: new Date()
          }
        }, 200, {}, requestId);
      });
    } catch (err) {
      console.error(`[Worker Respond Join Request Error ${requestId}]:`, err);
      return jsonResponse({ success: false, message: err.message || 'Error updating join request' }, 500, {}, requestId);
    }
  }

  // 17. Delete Join Request (DELETE /api/join-requests/:requestId)
  const reqDeleteMatch = url.pathname.match(/^\/api\/join-requests\/([a-fA-F0-9]{24})$/);
  if (reqDeleteMatch && request.method === 'DELETE') {
    const token = extractToken(request);
    if (!token) {
      return jsonResponse({ success: false, message: 'Authentication required. Please log in.' }, 401, {}, requestId);
    }
    const decoded = verifyToken(token, env);
    if (!decoded || !decoded.id) {
      return jsonResponse({ success: false, message: 'Invalid or expired session token.' }, 401, {}, requestId);
    }

    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      const requestIdParam = reqDeleteMatch[1];
      return await useDb(env, async (db) => {
        const userObjId = safeObjectId(decoded.id);
        const user = await db.collection('users').findOne({ _id: userObjId });
        const requestDoc = await db.collection('joinrequests').findOne({ _id: safeObjectId(requestIdParam) });

        if (!requestDoc) {
          return jsonResponse({ success: false, message: 'Join request not found.' }, 404, {}, requestId);
        }

        let trip = null;
        if (requestDoc.trip) {
          trip = await db.collection('trips').findOne({ _id: safeObjectId(requestDoc.trip) });
        } else if (requestDoc.mysteryTrip) {
          trip = await db.collection('mysterytrips').findOne({ _id: safeObjectId(requestDoc.mysteryTrip) });
        }

        const isTraveler = (requestDoc.user || '').toString() === decoded.id;
        const isOrganiserUser = ['organiser', 'organizer', 'admin'].includes((user?.role || '').toLowerCase());
        const isTripOrganiser = isOrganiserUser && (
          (requestDoc.organiser && requestDoc.organiser.toString() === decoded.id) ||
          (trip && trip.organiserId && trip.organiserId.toString() === decoded.id) ||
          (trip && trip.createdBy && trip.createdBy.toString() === decoded.id) ||
          (user?.role || '').toLowerCase() === 'admin'
        );

        if (!isTraveler && !isTripOrganiser) {
          return jsonResponse({
            success: false,
            message: 'Access denied: You can only delete your own requests or requests for trips you organise.'
          }, 403, {}, requestId);
        }

        if (isTraveler && !isTripOrganiser && requestDoc.status === 'approved') {
          return jsonResponse({
            success: false,
            message: 'This request has already been approved. Please contact the trip organiser to cancel your reservation.'
          }, 400, {}, requestId);
        }

        if (requestDoc.status === 'approved' && trip) {
          const seatsToRestore = requestDoc.seatsRequested || 1;
          const collectionName = requestDoc.mysteryTrip ? 'mysterytrips' : 'trips';
          await db.collection(collectionName).updateOne(
            { _id: trip._id },
            { $inc: { availableSeats: seatsToRestore } }
          );
          if (requestDoc.trip) {
            await db.collection('tripmembers').deleteOne({ trip: trip._id, user: safeObjectId(requestDoc.user) });
          }
        }

        await db.collection('joinrequests').deleteOne({ _id: requestDoc._id });

        return jsonResponse({
          success: true,
          message: 'Join request deleted successfully.'
        }, 200, {}, requestId);
      });
    } catch (err) {
      console.error(`[Worker Delete Join Request Error ${requestId}]:`, err);
      return jsonResponse({ success: false, message: err.message || 'Error deleting join request' }, 500, {}, requestId);
    }
  }

  // 18. Trips List & Explore (GET /api/trips)
  if (url.pathname === '/api/trips' && request.method === 'GET') {
    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      const explore = url.searchParams.get('explore') === 'true';
      const myTrips = url.searchParams.get('myTrips') === 'true';
      const q = (url.searchParams.get('q') || '').trim();

      const token = extractToken(request);
      const decoded = token ? verifyToken(token, env) : null;

      return await useDb(env, async (db) => {
        let currentUser = null;
        if (decoded && decoded.id) {
          currentUser = await db.collection('users').findOne({ _id: safeObjectId(decoded.id) });
        }
        const isOrganiserUser = ['organiser', 'organizer', 'admin'].includes((currentUser?.role || '').toLowerCase());

        let query = {};

        const statusParam = (url.searchParams.get('status') || '').toLowerCase();
        const now = new Date();
        const conditions = [];

        if (explore) {
          conditions.push({
            $and: [
              {
                $or: [
                  { isPublished: true },
                  { publicationStatus: { $in: ['Published', 'published'] } },
                  { status: { $in: ['published', 'Published'] } }
                ]
              },
              { isPublished: { $ne: false } },
              { publicationStatus: { $nin: ['Draft', 'draft', 'Unpublished', 'unpublished'] } },
              { status: { $nin: ['cancelled', 'draft', 'Draft'] } }
            ]
          });
        } else if (currentUser) {
          if (isOrganiserUser) {
            conditions.push({
              $or: [
                { createdBy: safeObjectId(currentUser._id) },
                { organiserId: safeObjectId(currentUser._id) },
                { createdBy: currentUser._id },
                { organiserId: currentUser._id }
              ]
            });
          } else {
            // Regular traveler: ONLY trips the user has joined/approved
            const [memberships, approvedReqs] = await Promise.all([
              db.collection('tripmembers').find({ user: safeObjectId(currentUser._id), status: 'accepted' }).toArray(),
              db.collection('joinrequests').find({ user: safeObjectId(currentUser._id), status: 'approved' }).toArray()
            ]);
            const joinedIds = [
              ...new Set([
                ...memberships.map(m => m.trip ? safeObjectId(m.trip) : null),
                ...approvedReqs.map(r => r.trip ? safeObjectId(r.trip) : null)
              ])
            ].filter(Boolean);
            conditions.push({ _id: { $in: joinedIds } });
          }
        } else {
          // Unauthenticated default to public explore
          conditions.push({
            $and: [
              {
                $or: [
                  { isPublished: true },
                  { publicationStatus: { $in: ['Published', 'published'] } },
                  { status: { $in: ['published', 'Published'] } }
                ]
              },
              { isPublished: { $ne: false } },
              { publicationStatus: { $nin: ['Draft', 'draft'] } }
            ]
          });
        }

        // Apply status filter if provided
        if (statusParam && statusParam !== 'all') {
          if (statusParam === 'upcoming') {
            conditions.push({
              $or: [{ startDate: { $gt: now } }, { $and: [{ endDate: { $gte: now } }, { status: 'upcoming' }] }],
              status: { $nin: ['completed', 'cancelled', 'ongoing'] }
            });
          } else if (statusParam === 'completed') {
            conditions.push({
              $or: [{ endDate: { $lt: now } }, { status: 'completed' }],
              status: { $ne: 'cancelled' }
            });
          } else if (statusParam === 'ongoing') {
            conditions.push({
              $or: [
                { status: 'ongoing' },
                { $and: [{ startDate: { $lte: now } }, { endDate: { $gte: now } }] }
              ],
              status: { $nin: ['completed', 'cancelled'] }
            });
          }
        } else if (!explore) {
          conditions.push({ status: { $ne: 'cancelled' } });
        }

        if (q) {
          conditions.push({
            $or: [
              { title: { $regex: new RegExp(q, 'i') } },
              { destination: { $regex: new RegExp(q, 'i') } },
              { description: { $regex: new RegExp(q, 'i') } }
            ]
          });
        }

        query = conditions.length > 1 ? { $and: conditions } : (conditions[0] || {});

        const rawTrips = await db.collection('trips')
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();

        const userIds = [
          ...new Set([
            ...rawTrips.map(t => t.createdBy).filter(Boolean).map(id => id.toString()),
            ...rawTrips.map(t => t.organiserId).filter(Boolean).map(id => id.toString())
          ])
        ];

        const usersList = await db.collection('users').find({
          _id: { $in: userIds.map(safeObjectId) }
        }).toArray();
        const userMap = new Map(usersList.map(u => [u._id.toString(), u]));

        let userRequestsMap = new Map();
        let userMembershipsSet = new Set();
        if (currentUser) {
          const [reqs, mems] = await Promise.all([
            db.collection('joinrequests').find({
              user: safeObjectId(currentUser._id),
              status: { $ne: 'cancelled' }
            }).toArray(),
            db.collection('tripmembers').find({
              user: safeObjectId(currentUser._id),
              status: 'accepted'
            }).toArray()
          ]);
          reqs.forEach(r => userRequestsMap.set((r.trip || '').toString(), r));
          mems.forEach(m => userMembershipsSet.add((m.trip || '').toString()));
        }

        const trips = rawTrips.map(t => {
          const tripIdStr = t._id.toString();
          const creator = userMap.get((t.createdBy || '').toString());
          const org = userMap.get((t.organiserId || '').toString());
          const req = userRequestsMap.get(tripIdStr);
          const isMember = userMembershipsSet.has(tripIdStr);

          const isOwner = currentUser && (
            (t.createdBy && t.createdBy.toString() === currentUser._id.toString()) ||
            (t.organiserId && t.organiserId.toString() === currentUser._id.toString())
          );

          const userRole = isOwner ? 'owner' : (isMember ? 'viewer' : 'none');

          return {
            _id: tripIdStr,
            id: tripIdStr,
            title: t.title,
            destination: t.destination,
            description: t.description || '',
            startDate: t.startDate,
            endDate: t.endDate,
            estimatedBudget: t.estimatedBudget || 1000,
            price: t.price || t.estimatedBudget || 1000,
            currency: t.currency || 'INR',
            coverImage: (t.coverImage && !isGenericPlaceholder(t.coverImage)) ? t.coverImage : resolveDestinationImage(t.destination, t.title),
            status: t.status || 'upcoming',
            capacity: t.capacity || 15,
            availableSeats: t.availableSeats !== undefined ? t.availableSeats : (t.capacity || 15),
            isPublished: t.isPublished !== false,
            publicationStatus: t.publicationStatus || (t.isPublished !== false ? 'Published' : 'Draft'),
            tags: t.tags || ['Vacation'],
            readinessScore: t.readinessScore || 0,
            createdBy: creator ? { _id: creator._id.toString(), name: creator.name, email: creator.email, avatar: creator.avatar || creator.profile?.avatar } : undefined,
            organiserId: org ? { _id: org._id.toString(), name: org.name, email: org.email, avatar: org.avatar || org.profile?.avatar } : undefined,
            userRole,
            isMember,
            isOwner,
            joinRequestStatus: req ? req.status : null,
            joinRequestId: req ? req._id.toString() : null,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt
          };
        });

        return jsonResponse({
          success: true,
          count: trips.length,
          trips
        }, 200, {}, requestId);
      });
    } catch (err) {
      console.error(`[Worker Trips Error ${requestId}]:`, err);
      return jsonResponse({ success: false, message: err.message || 'Error fetching trips' }, 500, {}, requestId);
    }
  }

  // 18.5 Smart Trip Recommendations (GET /api/trips/recommendations)
  if (url.pathname === '/api/trips/recommendations' && request.method === 'GET') {
    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      const destination = (url.searchParams.get('destination') || '').trim();
      const budget = Number(url.searchParams.get('budget') || url.searchParams.get('maxBudget') || 0);
      const duration = Number(url.searchParams.get('duration') || url.searchParams.get('durationDays') || 0);
      const rawInterests = url.searchParams.get('interests') || '';
      const interests = rawInterests ? rawInterests.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
      const limit = Number(url.searchParams.get('limit') || 20);

      return await useDb(env, async (db) => {
        const publishedFilter = {
          $and: [
            {
              $or: [
                { isPublished: true },
                { publicationStatus: { $in: ['Published', 'published'] } },
                { status: { $in: ['published', 'Published'] } }
              ]
            },
            { isPublished: { $ne: false } },
            { publicationStatus: { $nin: ['Draft', 'draft', 'Unpublished', 'unpublished'] } },
            { status: { $nin: ['cancelled', 'draft', 'Draft'] } }
          ]
        };

        const rawTrips = await db.collection('trips').find(publishedFilter).toArray();

        // Fetch organizers
        const orgIds = rawTrips.map(t => safeObjectId(t.organiserId || t.createdBy)).filter(Boolean);
        const organizers = await db.collection('users').find({ _id: { $in: orgIds } }).toArray();
        const orgMap = new Map();
        organizers.forEach(u => orgMap.set(u._id.toString(), {
          _id: u._id.toString(),
          name: u.name,
          email: u.email,
          avatar: u.avatar || u.profile?.avatar
        }));

        // Score trips
        const scoredTrips = rawTrips.map(t => {
          const tripIdStr = t._id.toString();
          const tripDays = (t.startDate && t.endDate)
            ? Math.max(1, Math.round((new Date(t.endDate) - new Date(t.startDate)) / (1000 * 60 * 60 * 24)))
            : (Number(t.durationDays) || 3);
          const tripCost = Number(t.price || t.estimatedBudget || 0);
          const availableSeats = t.availableSeats !== undefined ? Number(t.availableSeats) : (Number(t.capacity) || 10);
          const tripTags = Array.isArray(t.tags) ? t.tags : [];
          const text = `${t.title || ''} ${t.destination || ''} ${t.description || ''} ${tripTags.join(' ')}`.toLowerCase();

          let destinationPts = 0;
          let budgetPts = 0;
          let durationPts = 0;
          let interestPts = 0;
          let seatsBonus = 0;
          const matchReasons = [];

          // 1. Destination
          if (destination) {
            const destLower = destination.toLowerCase();
            const tripDestLower = (t.destination || '').toLowerCase();
            const tripTitleLower = (t.title || '').toLowerCase();
            if (tripDestLower === destLower) {
              destinationPts = 35;
              matchReasons.push(`Destination exact match: "${t.destination}"`);
            } else if (tripDestLower.includes(destLower) || destLower.includes(tripDestLower)) {
              destinationPts = 30;
              matchReasons.push(`Destination matches "${t.destination}"`);
            } else if (tripTitleLower.includes(destLower)) {
              destinationPts = 25;
              matchReasons.push(`Trip title matches "${t.title}"`);
            } else if (text.includes(destLower)) {
              destinationPts = 15;
              matchReasons.push(`Mentions destination keyword`);
            }
          } else {
            destinationPts = 20;
          }

          // 2. Budget
          if (budget > 0) {
            if (tripCost <= budget) {
              budgetPts = 30;
              const savings = budget - tripCost;
              if (savings > 0) {
                matchReasons.push(`Within budget: ₹${tripCost.toLocaleString('en-IN')} (saves ₹${savings.toLocaleString('en-IN')})`);
              } else {
                matchReasons.push(`Exact match for your ₹${budget.toLocaleString('en-IN')} budget`);
              }
            } else if (tripCost <= budget * 1.15) {
              budgetPts = 18;
              matchReasons.push(`Slight budget stretch (+${Math.round(((tripCost - budget) / budget) * 100)}%)`);
            } else if (tripCost <= budget * 1.30) {
              budgetPts = 10;
              matchReasons.push(`Moderate budget stretch (+${Math.round(((tripCost - budget) / budget) * 100)}%)`);
            }
          } else {
            budgetPts = 20;
          }

          // 3. Duration
          if (duration > 0) {
            const diff = Math.abs(tripDays - duration);
            if (diff === 0) {
              durationPts = 20;
              matchReasons.push(`Exact duration match: ${tripDays} days`);
            } else if (diff === 1) {
              durationPts = 15;
              matchReasons.push(`Duration: ${tripDays} days (1 day difference)`);
            } else if (diff === 2) {
              durationPts = 10;
              matchReasons.push(`Duration: ${tripDays} days (2 days difference)`);
            } else if (diff === 3) {
              durationPts = 5;
            }
          } else {
            durationPts = 15;
          }

          // 4. Interests
          if (interests.length > 0) {
            const matched = interests.filter(intItem => {
              const inTags = tripTags.some(tag => (tag || '').toLowerCase().includes(intItem) || intItem.includes((tag || '').toLowerCase()));
              return inTags || text.includes(intItem);
            });
            if (matched.length >= 2) {
              interestPts = 15;
              matchReasons.push(`Matches interests: ${matched.slice(0, 2).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}`);
            } else if (matched.length === 1) {
              interestPts = 10;
              matchReasons.push(`Matches interest: ${matched[0].charAt(0).toUpperCase() + matched[0].slice(1)}`);
            }
          } else {
            interestPts = 10;
          }

          // 5. Seats Bonus
          if (availableSeats > 0) {
            seatsBonus = 5;
            matchReasons.push(`${availableSeats} seat${availableSeats === 1 ? '' : 's'} available to join`);
          }

          const rawScore = destinationPts + budgetPts + durationPts + interestPts + seatsBonus;
          const matchScore = Math.min(100, Math.max(0, Math.round(rawScore)));

          const orgIdStr = (t.organiserId || t.createdBy)?.toString();
          const org = orgMap.get(orgIdStr) || { name: 'Verified Organiser' };

          return {
            _id: tripIdStr,
            id: tripIdStr,
            title: t.title,
            destination: t.destination,
            description: t.description || '',
            startDate: t.startDate,
            endDate: t.endDate,
            estimatedBudget: tripCost,
            price: tripCost,
            currency: t.currency || 'INR',
            capacity: Number(t.capacity) || 15,
            availableSeats,
            tags: tripTags,
            coverImage: (t.coverImage && !isGenericPlaceholder(t.coverImage)) ? t.coverImage : resolveDestinationImage(t.destination, t.title),
            organiserId: org,
            createdBy: org,
            matchScore,
            matchReasons,
            tripDays,
            tripCost
          };
        });

        // Sort descending by matchScore
        scoredTrips.sort((a, b) => b.matchScore - a.matchScore);

        const hasSpecificCriteria = Boolean(destination || budget > 0 || duration > 0 || interests.length > 0);
        const filtered = hasSpecificCriteria ? scoredTrips.filter(t => t.matchScore >= 40) : scoredTrips;
        const recommendations = filtered.slice(0, limit);

        return jsonResponse({
          success: true,
          count: recommendations.length,
          criteria: {
            destination: destination || null,
            budget: budget || null,
            duration: duration || null,
            interests
          },
          recommendations
        }, 200, {}, requestId);
      });
    } catch (err) {
      console.error(`[Worker Recommendations Error ${requestId}]:`, err);
      return jsonResponse({ success: false, message: err.message || 'Error fetching recommendations' }, 500, {}, requestId);
    }
  }

  // 19. Create Trip (POST /api/trips)
  if (url.pathname === '/api/trips' && request.method === 'POST') {
    const token = extractToken(request);
    if (!token) {
      return jsonResponse({ success: false, message: 'Authentication required. Please log in.' }, 401, {}, requestId);
    }
    const decoded = verifyToken(token, env);
    if (!decoded || !decoded.id) {
      return jsonResponse({ success: false, message: 'Invalid or expired session token.' }, 401, {}, requestId);
    }

    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      const body = await request.json().catch(() => ({}));
      const {
        title, destination, description, startDate, endDate,
        capacity, price, estimatedBudget, currency, coverImage, tags,
        emergencyContacts, isPublished, publicationStatus
      } = body;

      if (!title || !destination || !startDate || !endDate) {
        return jsonResponse({ success: false, message: 'Title, destination, start date, and end date are required.' }, 400, {}, requestId);
      }

      return await useDb(env, async (db) => {
        const userObjId = safeObjectId(decoded.id);
        const user = await db.collection('users').findOne({ _id: userObjId });
        if (!user || !['organiser', 'organizer', 'admin'].includes((user.role || '').toLowerCase())) {
          return jsonResponse({ success: false, message: 'Access denied: Only users with the Organiser role can create trips.' }, 403, {}, requestId);
        }

        const tripCapacity = Number(capacity) || 15;
        const tripIsPublished = isPublished !== undefined ? Boolean(isPublished) : ((publicationStatus || '').toLowerCase() === 'draft' ? false : true);
        const tripPublicationStatus = tripIsPublished ? 'Published' : 'Draft';

        const newTrip = {
          title: title.trim(),
          destination: destination.trim(),
          description: (description || '').trim(),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          estimatedBudget: Number(estimatedBudget) || Number(price) || 1000,
          price: Number(price) || Number(estimatedBudget) || 1000,
          currency: currency || user.preferences?.currency || 'INR',
          capacity: tripCapacity,
          availableSeats: tripCapacity,
          coverImage: (coverImage && !isGenericPlaceholder(coverImage)) ? coverImage : resolveDestinationImage(destination, title),
          status: 'upcoming',
          isPublished: tripIsPublished,
          publicationStatus: tripPublicationStatus,
          tags: tags || ['Vacation'],
          emergencyContacts: emergencyContacts || [],
          createdBy: user._id,
          organiserId: user._id,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await db.collection('trips').insertOne(newTrip);
        const tripId = result.insertedId;

        await db.collection('tripmembers').insertOne({
          trip: tripId,
          user: user._id,
          role: 'owner',
          status: 'accepted',
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const tripResponse = {
          ...newTrip,
          _id: tripId.toString(),
          id: tripId.toString(),
          createdBy: { _id: user._id.toString(), name: user.name, email: user.email, avatar: user.avatar || user.profile?.avatar },
          organiserId: { _id: user._id.toString(), name: user.name, email: user.email, avatar: user.avatar || user.profile?.avatar }
        };

        return jsonResponse({
          success: true,
          message: `Expedition "${newTrip.title}" created and published successfully!`,
          trip: tripResponse
        }, 201, {}, requestId);
      });
    } catch (err) {
      console.error(`[Worker Create Trip Error ${requestId}]:`, err);
      return jsonResponse({ success: false, message: err.message || 'Error creating trip' }, 500, {}, requestId);
    }
  }

  // 20. Trip Details (GET /api/trips/:tripId)
  const tripDetailsMatch = url.pathname.match(/^\/api\/trips\/([a-fA-F0-9]{24})$/);
  if (tripDetailsMatch && request.method === 'GET') {
    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      const tripIdParam = tripDetailsMatch[1];
      const token = extractToken(request);
      const decoded = token ? verifyToken(token, env) : null;

      return await useDb(env, async (db) => {
        const trip = await db.collection('trips').findOne({ _id: safeObjectId(tripIdParam) });
        if (!trip) {
          return jsonResponse({ success: false, message: 'Trip not found.' }, 404, {}, requestId);
        }

        const [creator, org] = await Promise.all([
          db.collection('users').findOne({ _id: safeObjectId(trip.createdBy) }),
          db.collection('users').findOne({ _id: safeObjectId(trip.organiserId) })
        ]);

        let isMember = false;
        let isOwner = false;
        let userRole = 'none';
        let joinRequestStatus = null;

        if (decoded && decoded.id) {
          const currentUserId = safeObjectId(decoded.id);
          const [membership, joinReq] = await Promise.all([
            db.collection('tripmembers').findOne({ trip: trip._id, user: currentUserId, status: 'accepted' }),
            db.collection('joinrequests').findOne({ trip: trip._id, user: currentUserId, status: { $ne: 'cancelled' } })
          ]);
          isOwner = (trip.createdBy && trip.createdBy.toString() === decoded.id) ||
                    (trip.organiserId && trip.organiserId.toString() === decoded.id);
          isMember = Boolean(membership) || isOwner;
          userRole = isOwner ? 'owner' : (membership ? (membership.role || 'viewer') : 'none');
          if (joinReq) joinRequestStatus = joinReq.status;
        }

        const populatedTrip = {
          ...trip,
          _id: trip._id.toString(),
          id: trip._id.toString(),
          isOwner,
          isMember,
          userRole,
          joinRequestStatus,
          createdBy: creator ? { _id: creator._id.toString(), name: creator.name, email: creator.email, avatar: creator.avatar || creator.profile?.avatar } : undefined,
          organiserId: org ? { _id: org._id.toString(), name: org.name, email: org.email, avatar: org.avatar || org.profile?.avatar } : undefined
        };

        return jsonResponse({
          success: true,
          trip: populatedTrip
        }, 200, {}, requestId);
      });
    } catch (err) {
      console.error(`[Worker Trip Details Error ${requestId}]:`, err);
      return jsonResponse({ success: false, message: err.message || 'Error fetching trip details' }, 500, {}, requestId);
    }
  }

  // 21. Dedicated Publish & Unpublish Routes (POST/PATCH/PUT /api/trips/:tripId/publish | unpublish)
  const tripPublishMatch = url.pathname.match(/^\/api\/trips\/([a-fA-F0-9]{24})\/(publish|unpublish)$/);
  if (tripPublishMatch && ['POST', 'PATCH', 'PUT'].includes(request.method)) {
    const token = extractToken(request);
    if (!token) {
      return jsonResponse({ success: false, message: 'Authentication required. Please log in.' }, 401, {}, requestId);
    }
    const decoded = verifyToken(token, env);
    if (!decoded || !decoded.id) {
      return jsonResponse({ success: false, message: 'Invalid or expired session token.' }, 401, {}, requestId);
    }

    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      const tripId = tripPublishMatch[1];
      const action = tripPublishMatch[2];
      const isPublish = action === 'publish';

      return await useDb(env, async (db) => {
        const userObjId = safeObjectId(decoded.id);
        const user = await db.collection('users').findOne({ _id: userObjId });
        if (!user || !['organiser', 'organizer', 'admin'].includes((user.role || '').toLowerCase())) {
          return jsonResponse({ success: false, message: 'Access denied: Only organisers can publish or unpublish trips.' }, 403, {}, requestId);
        }

        const trip = await db.collection('trips').findOne({ _id: safeObjectId(tripId) });
        if (!trip) {
          return jsonResponse({ success: false, message: 'Trip not found.' }, 404, {}, requestId);
        }

        const isOwner = (trip.createdBy && trip.createdBy.toString() === decoded.id) ||
                        (trip.organiserId && trip.organiserId.toString() === decoded.id) ||
                        (user.role || '').toLowerCase() === 'admin';
        if (!isOwner) {
          return jsonResponse({ success: false, message: 'Access denied: You can only publish trips you organise.' }, 403, {}, requestId);
        }

        await db.collection('trips').updateOne(
          { _id: trip._id },
          {
            $set: {
              isPublished: isPublish,
              publicationStatus: isPublish ? 'Published' : 'Draft',
              updatedAt: new Date()
            }
          }
        );

        return jsonResponse({
          success: true,
          message: `Expedition ${isPublish ? 'published' : 'moved to drafts'} successfully!`,
          trip: {
            ...trip,
            _id: trip._id.toString(),
            isPublished: isPublish,
            publicationStatus: isPublish ? 'Published' : 'Draft'
          }
        }, 200, {}, requestId);
      });
    } catch (err) {
      console.error(`[Worker Publish/Unpublish Error ${requestId}]:`, err);
      return jsonResponse({ success: false, message: err.message || 'Error updating publication status' }, 500, {}, requestId);
    }
  }

  // 22. Delete Trip (DELETE /api/trips/:tripId)
  const tripDelMatch = url.pathname.match(/^\/api\/trips\/([a-fA-F0-9]{24})$/);
  if (tripDelMatch && request.method === 'DELETE') {
    const token = extractToken(request);
    if (!token) {
      return jsonResponse({ success: false, message: 'Authentication required. Please log in.' }, 401, {}, requestId);
    }
    const decoded = verifyToken(token, env);
    if (!decoded || !decoded.id) {
      return jsonResponse({ success: false, message: 'Invalid or expired session token.' }, 401, {}, requestId);
    }

    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      const tripId = tripDelMatch[1];
      return await useDb(env, async (db) => {
        const trip = await db.collection('trips').findOne({ _id: safeObjectId(tripId) });
        if (!trip) {
          return jsonResponse({ success: false, message: 'Trip not found.' }, 404, {}, requestId);
        }

        const isOwner = (trip.createdBy && trip.createdBy.toString() === decoded.id) ||
                        (trip.organiserId && trip.organiserId.toString() === decoded.id) ||
                        (decoded.role === 'admin');
        if (!isOwner) {
          return jsonResponse({ success: false, message: 'Access denied: You can only delete trips you organise.' }, 403, {}, requestId);
        }

        await Promise.all([
          db.collection('trips').deleteOne({ _id: trip._id }),
          db.collection('tripmembers').deleteMany({ trip: trip._id }),
          db.collection('joinrequests').deleteMany({ trip: trip._id })
        ]);

        return jsonResponse({
          success: true,
          message: 'Trip deleted successfully.'
        }, 200, {}, requestId);
      });
    } catch (err) {
      console.error(`[Worker Delete Trip Error ${requestId}]:`, err);
      return jsonResponse({ success: false, message: err.message || 'Error deleting trip' }, 500, {}, requestId);
    }
  }

  // 12. Proxy remaining /api/* routes safely to the live Render backend
  // Preserves 100% of all existing trips, bookings, itinerary, and organiser routes
  if (url.pathname.startsWith('/api')) {
    return proxyToBackend(request, env, url, null, requestId);
  }

  // 9. Otherwise serve static assets from Cloudflare Edge
  if (env.ASSETS) {
    return env.ASSETS.fetch(request);
  }

  return new Response('JourneyHub Cloudflare Worker Active', { status: 200, headers: { 'X-Request-Id': requestId } });
}

function jsonResponse(data, status = 200, headers = {}, requestId = null) {
  const payload = { ...data };
  if (requestId && payload.success === false && !payload.requestId) {
    payload.requestId = requestId;
  }
  const resHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    ...headers
  };
  if (requestId) {
    resHeaders['X-Request-Id'] = requestId;
  }
  return new Response(JSON.stringify(payload), {
    status,
    headers: resHeaders
  });
}

async function proxyToBackend(request, env, url, preloadedBody = null, requestId = null) {
  const backendUrl = env.BACKEND_API_URL || 'https://journeyhub-m5lq.onrender.com';
  const targetUrl = new URL(url.pathname + url.search, backendUrl);

  const newHeaders = new Headers(request.headers);
  newHeaders.set('X-Forwarded-Host', url.hostname);
  newHeaders.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
  if (requestId) {
    newHeaders.set('X-Request-Id', requestId);
  }

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  let body = undefined;
  if (hasBody) {
    if (preloadedBody !== null) {
      body = typeof preloadedBody === 'string' ? preloadedBody : JSON.stringify(preloadedBody);
    } else if (!request.bodyUsed) {
      body = await request.arrayBuffer().catch(() => undefined);
    }
  }

  const proxyReq = new Request(targetUrl.toString(), {
    method: request.method,
    headers: newHeaders,
    body,
    redirect: 'follow'
  });

  try {
    const response = await fetch(proxyReq);
    const resHeaders = new Headers(response.headers);
    resHeaders.set('Access-Control-Allow-Origin', '*');
    resHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, X-Request-Id');
    if (requestId) {
      resHeaders.set('X-Request-Id', requestId);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      message: 'Failed to reach backend service: ' + err.message
    }, 502, {}, requestId);
  }
}
