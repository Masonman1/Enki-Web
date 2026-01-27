// app/api/ai-rewrite/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trigger_desc, clause_desc } = body;

    // Stub: Mock AI rewrite with legal flair
    const trigger_rewrite = `CSI equals ${trigger_desc.match(/\d{6}/)?.[0] || 'unknown'} AND scope_item contains '${trigger_desc.split(' ').slice(-3).join(' ')}'`;
    const clause_rewrite = `Exhibit: The General Contractor shall indemnify and hold harmless the Subcontractor from any and all claims, losses, or delays arising from ${clause_desc.toLowerCase()}, pursuant to applicable building codes and subcontractor agreements. Subcontractor entitled to equitable adjustment for additional costs.`;
    const suggested_name = trigger_desc.toLowerCase().replace(/\s+/g, '_').slice(0, 50);

    return NextResponse.json({ trigger_rewrite, clause_rewrite, suggested_name });
  } catch (error) {
    console.error('AI rewrite error:', error);
    return NextResponse.json({ error: 'Rewrite failed' }, { status: 500 });
  }
}