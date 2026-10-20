/**
 * JourneyHub Cloudflare Worker Entry Point
 * Unifies Cloudflare Edge Static Asset Delivery, Direct Serverless Resend OTP & MongoDB Atlas Verification,
 * and seamless fallback proxy to the Render backend for remaining APIs.
 */

import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

let cachedClient = null;

async function getDb(env) {
  const uri = env.MONGODB_URI;
  if (!uri) return null;
  if (cachedClient) return cachedClient.db('journeyhub');
  try {
    cachedClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    await cachedClient.connect();
    return cachedClient.db('journeyhub');
  } catch (err) {
    console.error('[Worker DB] Connection error:', err.message);
    cachedClient = null;
    return null;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. CORS Preflight Handling
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // 2. Health & Diagnostics Check
    if (url.pathname === '/api/health') {
      const db = await getDb(env).catch(() => null);
      return new Response(JSON.stringify({
        status: 'online',
        platform: 'cloudflare-workers',
        appName: 'JourneyHub',
        version: '2.0.0',
        resendConfigured: Boolean(env.RESEND_API_KEY),
        databaseConnected: Boolean(db),
        timestamp: new Date().toISOString()
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 3. Email Provider Status Check
    if (url.pathname === '/api/auth/email-status') {
      const apiKey = env.RESEND_API_KEY || '';
      const isResend = Boolean(apiKey && apiKey.startsWith('re_'));
      return new Response(JSON.stringify({
        success: true,
        provider: isResend ? 'resend' : 'none',
        isConfigured: isResend,
        sender: env.RESEND_FROM || 'JourneyHub <onboarding@resend.dev>',
        apiKeyMasked: isResend ? `${apiKey.slice(0, 6)}••••${apiKey.slice(-4)}` : '(none)'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 4. Send Email OTP (Direct Serverless Resend Delivery)
    if (url.pathname === '/api/auth/send-email-otp' || url.pathname === '/api/auth/send-otp') {
      if (request.method === 'POST') {
        const apiKey = env.RESEND_API_KEY;
        const db = await getDb(env).catch(() => null);

        // If either Resend or DB is not configured in Worker, gracefully proxy to Render backend
        if (!apiKey || !db) {
          return proxyToBackend(request, env, url);
        }

        try {
          const body = await request.json().catch(() => ({}));
          const email = (body.email || '').trim().toLowerCase();
          const name = (body.name || 'Traveler').trim();

          if (!email || !email.includes('@')) {
            return jsonResponse({ success: false, message: 'Please provide a valid email address.' }, 400);
          }

          // Check if user already exists
          const existingUser = await db.collection('users').findOne({ email });
          if (existingUser) {
            return jsonResponse({
              success: false,
              message: 'An account with this email address already exists. Please sign in.'
            }, 400);
          }

          // Rate limiting / cooldown check (60 seconds)
          const pending = await db.collection('emailverifications').findOne({ email });
          if (pending && pending.resendAvailableAt && new Date(pending.resendAvailableAt) > new Date()) {
            const waitSeconds = Math.ceil((new Date(pending.resendAvailableAt).getTime() - Date.now()) / 1000);
            return jsonResponse({
              success: false,
              message: `An OTP was recently sent. Please wait ${waitSeconds} seconds before requesting a new code.`,
              cooldown: waitSeconds
            }, 429);
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
            }, 400);
          }

          // Store verification in MongoDB Atlas
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
            message: `A 6-digit verification code has been dispatched to ${email} via Resend. Please check your Gmail inbox.`,
            email,
            cooldown: 60
          }, 200);
        } catch (err) {
          console.error('[Worker OTP Error]:', err);
          return jsonResponse({ success: false, message: err.message || 'Error dispatching OTP' }, 500);
        }
      }
    }

    // 5. Verify Email OTP (Direct Serverless Verification)
    if (url.pathname === '/api/auth/verify-email-otp' || url.pathname === '/api/auth/verify-otp') {
      if (request.method === 'POST') {
        const db = await getDb(env).catch(() => null);
        if (!db) {
          return proxyToBackend(request, env, url);
        }

        try {
          const body = await request.json().catch(() => ({}));
          const email = (body.email || '').trim().toLowerCase();
          const otp = (body.otp || '').toString().trim();

          if (!email || otp.length !== 6) {
            return jsonResponse({ success: false, message: 'Please provide email and 6-digit verification code.' }, 400);
          }

          const pending = await db.collection('emailverifications').findOne({ email });
          if (!pending) {
            return jsonResponse({ success: false, message: 'No pending verification found. Please click "Send OTP" first.' }, 400);
          }

          if (new Date(pending.expiresAt) < new Date()) {
            return jsonResponse({ success: false, message: 'Verification code has expired. Please request a new code.' }, 400);
          }

          if (pending.attempts >= 5) {
            return jsonResponse({ success: false, message: 'Too many incorrect attempts. Please request a fresh code.' }, 429);
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
            }, 400);
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
          }, 200);
        } catch (err) {
          return jsonResponse({ success: false, message: err.message || 'Error verifying OTP' }, 500);
        }
      }
    }

    // 6. Proxy remaining /api/* routes safely to the live Render backend
    // Preserves 100% of all existing endpoints, sessions, trips, bookings, and models
    if (url.pathname.startsWith('/api')) {
      return proxyToBackend(request, env, url);
    }

    // 7. Otherwise serve static assets from Cloudflare Edge
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('JourneyHub Cloudflare Worker Active', { status: 200 });
  }
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

async function proxyToBackend(request, env, url) {
  const backendUrl = env.BACKEND_API_URL || 'https://journeyhub-m5lq.onrender.com';
  const targetUrl = new URL(url.pathname + url.search, backendUrl);

  const newHeaders = new Headers(request.headers);
  newHeaders.set('X-Forwarded-Host', url.hostname);
  newHeaders.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

  const proxyReq = new Request(targetUrl.toString(), {
    method: request.method,
    headers: newHeaders,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'follow'
  });

  try {
    const response = await fetch(proxyReq);
    const resHeaders = new Headers(response.headers);
    resHeaders.set('Access-Control-Allow-Origin', '*');
    resHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      message: 'Failed to reach backend service: ' + err.message
    }, 502);
  }
}
