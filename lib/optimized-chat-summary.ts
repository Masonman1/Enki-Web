export interface OptimizedChatSummary {
  id: string;
  dt: string;
  ov: {
    changes: string[];
    branch?: string;
    files?: string[];
    next_action: string;
  };
  achvs: string[];
  decs: string[];
  todos?: { desc: string; pri: string }[];  // Optional if empty
  nxt: string[];
  ctx: string[];
  pid: string | null;
  priors?: OptimizedChatSummary[];  // Recursive for prior summaries (type-safe)
  stat: {
    tested: string[];
    pend: string[];
  };
  cont: boolean;
  schema_version?: 'v2-opt';
}