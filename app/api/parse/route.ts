// app/api/parse/route.ts (enhanced with logs)
import { NextRequest, NextResponse } from 'next/server';
import { parseFilesAction } from '@/lib/ai-actions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('API Parse Body:', body);
    console.log('SUPABASE_URL in Route:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Undefined'); // Match .env
    console.log('SUPABASE_SERVICE_KEY in Route:', process.env.SUPABASE_SERVICE_KEY ? 'Set (length: ' + process.env.SUPABASE_SERVICE_KEY.length + ')' : 'Undefined');

    const { fileUrls, focus, userId } = body;
    const results = await parseFilesAction(fileUrls, focus, userId);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Parse API error:', error); // Logs to server terminal
    return NextResponse.json({ error: 'Parse failed: ' + (error instanceof Error ? error.message : 'Unknown') }, { status: 500 });
  }
}