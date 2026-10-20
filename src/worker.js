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

  // 6. Complete Registration (Direct Serverless Registration)
  if (url.pathname === '/api/auth/register' && request.method === 'POST') {
    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      const body = await request.json().catch(() => ({}));
      const name = (body.name || '').trim();
      const email = (body.email || '').trim().toLowerCase();
      const password = body.password || '';
      const confirmPassword = body.confirmPassword;
      const phone = (body.phone || '').trim();

      if (name.length < 2) {
        return jsonResponse({ success: false, message: 'Full name must be at least 2 characters.' }, 400, {}, requestId);
      }
      if (!email.includes('@')) {
        return jsonResponse({ success: false, message: 'Please provide a valid email address.' }, 400, {}, requestId);
      }
      if (password.length < 6) {
        return jsonResponse({ success: false, message: 'Password must be at least 6 characters long.' }, 400, {}, requestId);
      }
      if (confirmPassword !== undefined && password !== confirmPassword) {
        return jsonResponse({ success: false, message: 'Passwords do not match.' }, 400, {}, requestId);
      }

      return await useDb(env, async (db) => {
        // Check if verified via OTP
        const verifiedRecord = await db.collection('emailverifications').findOne({ email, isVerified: true });
        if (!verifiedRecord) {
          return jsonResponse({
            success: false,
            message: 'Please send and verify the OTP for your email address before completing registration.'
          }, 400, {}, requestId);
        }

        // Expiry check (30 minutes)
        if (verifiedRecord.verifiedAt && Date.now() - new Date(verifiedRecord.verifiedAt).getTime() > 30 * 60 * 1000) {
          return jsonResponse({
            success: false,
            message: 'Email verification has expired. Please verify your email address again.'
          }, 400, {}, requestId);
        }

        // Duplicate check
        const existingEmailUser = await db.collection('users').findOne({ email });
        if (existingEmailUser) {
          return jsonResponse({
            success: false,
            message: 'An account with this email address already exists. Please log in.'
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
          phoneVerified: false,
          verificationMethod: 'email',
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
        await db.collection('emailverifications').deleteOne({ _id: verifiedRecord._id });

        const token = generateToken(result.insertedId, env);

        return jsonResponse({
          success: true,
          message: 'Registration successful! Welcome to JourneyHub.',
          token,
          user: {
            _id: result.insertedId.toString(),
            name,
            email,
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

  // 7. Login (Direct Serverless Authentication)
  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    const dbAvailable = Boolean(env.MONGODB_URI);
    if (!dbAvailable) {
      return proxyToBackend(request, env, url, null, requestId);
    }

    try {
      const body = await request.json().catch(() => ({}));
      const loginTarget = ((body.identifier || body.email || body.phone || '')).toString().trim().toLowerCase();
      const password = body.password || '';

      if (!loginTarget || !password) {
        return jsonResponse({ success: false, message: 'Please enter your email and password.' }, 400, {}, requestId);
      }

      return await useDb(env, async (db) => {
        let user = await db.collection('users').findOne({ email: loginTarget });
        if (!user && !loginTarget.includes('@')) {
          user = await db.collection('users').findOne({
            role: 'organiser',
            name: { $regex: new RegExp(`^${loginTarget}$`, 'i') }
          });
        }
        if (!user) {
          user = await db.collection('users').findOne({
            $or: [{ phone: loginTarget }, { 'profile.phone': loginTarget }]
          });
        }

        if (!user) {
          return jsonResponse({ success: false, message: 'Invalid email or password.' }, 401, {}, requestId);
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return jsonResponse({ success: false, message: 'Invalid email or password.' }, 401, {}, requestId);
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
