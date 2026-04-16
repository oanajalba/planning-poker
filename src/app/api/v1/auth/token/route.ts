import { NextResponse } from 'next/server';
import crypto from 'crypto';

// We must securely fetch the JWT Secret defined in the project settings
const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    if (!supabaseJwtSecret) {
      console.error("SUPABASE_JWT_SECRET is completely missing in environment variables.");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Bypass `jose` WebCrypto bugs in Next.js by strictly constructing the standard JWT natively.
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    
    // We use role: "anon" so it triggers standard RLS but with our custom claim.
    const payload = Buffer.from(JSON.stringify({ 
      role: 'anon', 
      app_session_id: sessionId,
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiration
    })).toString('base64url');
    
    const signature = crypto.createHmac('sha256', supabaseJwtSecret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    const token = `${header}.${payload}.${signature}`;

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
