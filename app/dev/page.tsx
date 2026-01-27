// app/dev/page.tsx (UPDATED: Valid mockGraph + dynamic Mermaid wrapper for TS/build fix)

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
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
  nodes: Array<{ id: string; category: string; desc: string; weight: number; external?: boolean }>;
  edges: Array<{ source: string; target: string; type: string; weight: number }>;
  stats: { nodeCount: number; edgeCount: number; avgLines: number };
}

export default function DevPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!session) {
      router.push('/dashboard');
      toast.error('Admin access required');
      return;
    }

    // Valid minimal mock (matches interface) – replace with real data later
    const mockGraph: GraphData = {
      generated_at: "2026-01-27T02:25:34.712Z",
      branch: "refactor-phase1-flatten",
      subgraphs: {
        PhasePages: { ids: [], desc: "All Phase 1 subphase pages" },
        AiActions: { ids: ["ai-actions_ts"], desc: "AI parse/split/risk modules" },
      },
      nodes: [
        { id: "page_tsx", category: "misc", desc: "Dashboard page", weight: 296 },
        { id: "ai-actions_ts", category: "misc", desc: "AI actions", weight: 66 },
      ],
      edges: [
        { source: "page_tsx", target: "ai-actions_ts", type: "import", weight: 7 },
      ],
      stats: { nodeCount: 2, edgeCount: 1, avgLines: 181 },
    };

    setGraphData(mockGraph);
    setLoading(false);
  }, [session, router]);

  function generateMermaidChart(data: GraphData) {
    let chart = 'graph TD;\n';
    data.nodes.forEach(node => {
      chart += `${node.id}["${node.desc.slice(0, 20)}..."]\n`;
    });
    data.edges.forEach(edge => {
      chart += `${edge.source} --> |${edge.type}| ${edge.target}\n`;
    });
    return chart;
  }

  if (loading) return <p>Loading graph...</p>;

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Dev Dashboard: Code Graph Integration</CardTitle>
          <CardDescription>Admin view for enki-enhanced-graph.json analysis (branch: {graphData?.branch || 'N/A'})</CardDescription>
        </CardHeader>
        <CardContent>
          {graphData ? (
            <>
              {/* Subgraphs Table */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Subgraphs</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(graphData.subgraphs).map(([name, { desc }]) => (
                      <TableRow key={name}>
                        <TableCell>{name}</TableCell>
                        <TableCell>{desc}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Nodes Table */}
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-4">Nodes</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {graphData.nodes.map((node, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{node.id}</TableCell>
                        <TableCell>{node.category}</TableCell>
                        <TableCell>{node.desc}</TableCell>
                        <TableCell>{node.weight}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Edges Table */}
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-4">Edges</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {graphData.edges.map((edge, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{edge.source}</TableCell>
                        <TableCell>{edge.target}</TableCell>
                        <TableCell>{edge.type}</TableCell>
                        <TableCell>{edge.weight}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mermaid Visualization */}
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-4">Graph Visualization (Mermaid DAG)</h2>
                {graphData.edges.length > 0 ? (
                  <MermaidChart chart={generateMermaidChart(graphData)} />
                ) : (
                  <p>No edges to visualize.</p>
                )}
              </div>
            </>
          ) : (
            <p>No graph data available.</p>
          )}
          <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to Main Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  );
}