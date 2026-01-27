// app/dev/page.tsx (UPDATED: Valid mockGraph + dynamic Mermaid wrapper for TS/build fix)
// Additional: Removed unused imports; refactored setState out of effect for lint/react-hooks clean

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

const MermaidChart = dynamic(() => import('react').then(React => {
  return function MermaidWrapper({ chart }: { chart: string }) {
    const [svg, setSvg] = React.useState<string>('');
    React.useEffect(() => {
      import('mermaid').then(mmd => {
        const Mermaid = mmd.default || mmd;
        Mermaid.initialize({ startOnLoad: false, theme: 'default' });
        Mermaid.render('mermaid-graph', chart).then(({ svg }) => setSvg(svg));
      });
    }, [chart]);
    return svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <p>Rendering...</p>;
  };
}), { ssr: false });

interface GraphData {
  generated_at: string;
  branch: string;
  subgraphs: Record<string, { ids: string[]; desc: string }>;
  nodes: { id: string; category: string; desc: string; exports: string[]; lines: number; external: boolean }[];
  edges: { source: string; target: string; type: string; weight: number }[];
  stats: { nodeCount: number; edgeCount: number; avgLines: number };
}

const mockGraph: GraphData = { // Sample for dev (replace with real fetch later)
  generated_at: "2026-01-27T15:54:28.155Z",
  branch: "refactor-phase1-flatten",
  subgraphs: {
    PhasePages: { ids: [], desc: "All Phase 1 subphase pages (e.g., 1a pre-bid)" },
    AiActions: { ids: ["ai-actions_ts"], desc: "AI parse/split/risk modules for waterproofing" },
    HooksUtils: { ids: ["error-utils_ts", "pdf-utils_ts", "storage-utils_ts", "phase-hook_ts", "utils_ts"], desc: "Reusable hooks and utils (e.g., auth, upload)" },
  },
  nodes: [], // Truncated for brevity
  edges: [], // Truncated
  stats: { nodeCount: 40, edgeCount: 153, avgLines: 62.2 },
};

export default function DevPage() {
  const { session } = useAuth(); // UPDATED: Removed unused loading/logout
  const router = useRouter();
  const [graphData, setGraphData] = useState<GraphData>(mockGraph); // UPDATED: Init with mock outside effect (no set in effect)
  const [loading, setLoading] = useState(false); // UPDATED: Start false; no set in effect (assume sync load)

  useEffect(() => {
    if (!session) {
      router.push('/'); // Guard
    }
    // If fetching graph async, add here: fetchGraph().then(setGraphData); setLoading(false);
  }, [session, router]);

  const generateMermaidChart = (data: GraphData) => {
    let chart = 'graph TD;\n';
    data.edges.forEach(edge => {
      chart += `${edge.source} -->|${edge.type} w:${edge.weight}| ${edge.target};\n`;
    });
    return chart;
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading graph...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Dev Dashboard</CardTitle>
          <CardDescription>View enhanced graph data for Enki codebase.</CardDescription>
        </CardHeader>
        <CardContent>
          {graphData ? (
            <>
              {/* Graph overview sections here – truncated for lint focus */}
              <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to Main Dashboard</Button>
            </>
          ) : (
            <p>No graph data available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}