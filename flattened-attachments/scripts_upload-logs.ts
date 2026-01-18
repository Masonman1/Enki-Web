import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log('Loaded env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE'))); // Debug: Show Supabase-related keys

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing vars - URL:', supabaseUrl, 'SERVICE_KEY:', supabaseServiceKey ? '[set]' : '[unset]');
  throw new Error('Missing SUPABASE_URL or SERVICE_KEY in .env.local');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function uploadLogs() {
  try {
    // Hardcoded new summaries starting at ID 200 (for manual upsert test; reflects priors limiting changes)
    const newSummaries = [
      {
        id: "200",
        dt: "2026-01-08",
        ov: {
          changes: [
            "Discussed priors limiting in child chats to avoid scope drift",
            "Agreed on embedding instructions in chat summaries for auto-pull/scan of parent chains (e.g., '100%'-like IDs, 3-deep max via priors recursion)"
          ],
          branch: "phase1-dev",
          files: ["Enki-App_Enki-ContextLoadTriggers.json", "apps_web_app_dashboard_page.tsx", "lib_optimized-chat-summary.ts"],
          next_action: "Test auto-pull in child chat with bounded scan"
        },
        achvs: ["Clarified separation of context triggers from handoff workflow", "Identified omission of chain-limiting instruction in summaries"],
        decs: ["Handle via ctx reminders in summaries to maintain isolation and reduce risks"],
        todos: [{ desc: "Embed chain-limiting prompt in future summaries (e.g., auto-query Supabase for 'pid' chains, limit depth 3)", pri: "high" }],
        nxt: ["Test in new child chat", "Update dashboard fetch for chain filtering"],
        ctx: ["Enki Phase 1: Refine child chat initialization for risk-reduced priors aggregation; isolate triggers from handoffs"],
        pid: null,  // Root for new test chain
        stat: {
          tested: ["summary embedding", "chain recursion logic"],
          pend: ["depth limiting implementation"]
        },
        cont: true,
        schema_version: "v2-opt"
      },
      {
        id: "200.1",
        dt: "2026-01-08",
        ov: {
          changes: [
            "Proposed dashboard updates for filtered priors fetch (e.g., recursive traversal with max_depth: 3)",
            "Confirmed manual upsert test for new summaries to validate JSONB aggregation"
          ],
          branch: "phase1-dev",
          files: ["apps_web_scripts_upload-logs.ts", "apps_web_app_dashboard_page.tsx"],
          next_action: "Manual code updates post-test for chain bounding"
        },
        achvs: ["Validated approach for automatic child chat scans via summary instructions"],
        decs: ["Use ctx for prompts to avoid schema changes; manual updates after test to minimize risks"],
        todos: [{ desc: "Implement recursive depth-limited function in dashboard useEffect for priors aggregation", pri: "medium" }],
        nxt: ["Run manual upsert test", "Verify dashboard refresh shows bounded chain"],
        ctx: ["Enki Phase 1: Child chat test for priors limiting; build on parent 200 for continuity"],
        pid: "200",
        priors: [{ id: "200", dt: "2026-01-08" /* Truncated; full prior would be embedded in real upsert */ }],
        stat: {
          tested: ["manual upsert simulation", "prompt integration"],
          pend: ["full chain filtering in production"]
        },
        cont: false,
        schema_version: "v2-opt"
      }
    ];

    const userId = 'a288c013-35e9-4d16-8313-31804fae9b9b'; // Your user ID; adjust if needed

    // Fetch existing summaries first
    const { data: existing, error: fetchError } = await supabase
      .from('dev_logs')
      .select('summaries')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // Ignore if no row exists
      console.error('Fetch error:', fetchError.message);
      return;
    }

    const currentSummaries = existing?.summaries || [];
    const updatedSummaries = [...currentSummaries, ...newSummaries]; // Append the new summaries

    // Upsert the updated array
    const { data, error } = await supabase
      .from('dev_logs')
      .upsert({
        user_id: userId,
        summaries: updatedSummaries
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Upload error:', error.message);
    } else {
      console.log('Logs uploaded successfully:', data);
      console.log('Updated summaries array:', updatedSummaries); // Debug: Verify append
    }
  } catch (err) {
    console.error('Script error:', err);
  }
}

uploadLogs();