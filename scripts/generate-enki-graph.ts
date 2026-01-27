import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { program } from 'commander';

const __filename = fileURLToPath(import.meta.url);

interface Node {
  id: string;
  category: 'app' | 'lib' | 'component' | 'script' | 'config' | 'misc';
  desc: string;
  exports: string[];
  lines: number;
  external: boolean;
}

interface Edge {
  source: string;
  target: string;
  type: 'import' | 'call' | 'extends';
  weight: number;
}

interface Subgraph {
  ids: string[];
  desc: string;
}

interface Graph {
  generated_at: string;
  branch: string;
  subgraphs: Record<string, Subgraph>;
  nodes: Node[];
  edges: Edge[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    avgLines: number;
  };
}

program.option('--focus <dirs>', 'Comma-separated directories to scan', 'app,lib,components');
program.parse();

async function generateGraph(dir: string = '.') {
  const opts = program.opts();
  const focusDirs = opts.focus ? opts.focus.split(',') : ['app', 'lib', 'components'];

  const graph: Graph = {
    generated_at: new Date().toISOString(),
    branch: 'refactor-phase1-flatten',
    subgraphs: {
      PhasePages: { ids: [], desc: 'All Phase 1 subphase pages (e.g., 1a pre-bid)' },
      AiActions: { ids: [], desc: 'AI parse/split/risk modules for waterproofing' },
      HooksUtils: { ids: [], desc: 'Reusable hooks and utils (e.g., auth, upload)' },
    },
    nodes: [],
    edges: [],
    stats: { nodeCount: 0, edgeCount: 0, avgLines: 0 },
  };

  const exclude = ['node_modules', '.next', 'out', 'coverage', 'flattened-attachments'];
  const files = await getFiles(dir, /\.(ts|tsx)$/, [], exclude, focusDirs);

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf-8');
    const id = path.basename(filePath).replace(/\./g, '_');
    const category = categorizeFile(filePath);
    const desc = extractDesc(content);
    const exports = extractExports(content).slice(0, 5);
    const lines = content.split('\n').length;
    const external = id.includes('_ts') && !['app', 'lib', 'component', 'script'].includes(category);

    graph.nodes.push({ id, category, desc, exports, lines, external });

    const imports = extractImports(content);
    for (const imp of imports) {
      const target = normalizeTarget(imp);
      const weight = calculateWeight('import', id, target);
      graph.edges.push({ source: id, target, type: 'import', weight });
    }

    const calls = extractCalls(content);
    for (const call of calls) {
      const weight = calculateWeight('call', id, call);
      graph.edges.push({ source: id, target: call, type: 'call', weight });
    }

    assignToSubgraph(graph.subgraphs, id, category);
  }

  graph.stats = {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    avgLines: graph.nodes.reduce((sum, n) => sum + n.lines, 0) / graph.nodes.length || 0,
  };

  const outputPath = path.join(dir, 'enki-enhanced-graph.json');
  await fs.writeFile(outputPath, JSON.stringify(graph, null, 2)); // Use null, 0 for minified if needed
  console.log(`✅ Enhanced graph saved: ${outputPath} (${graph.stats.nodeCount} nodes, ${graph.stats.edgeCount} edges)`);

  const mermaid = generateMermaid(graph);
  await fs.writeFile(path.join(dir, 'enki-enhanced-graph.mmd'), mermaid);
  console.log('✅ Mermaid syntax saved: enki-enhanced-graph.mmd');
}

async function getFiles(
  dir: string,
  ext: RegExp,
  files: string[] = [],
  exclude: string[] = [],
  focusDirs: string[] = []
): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!exclude.includes(entry.name) && (focusDirs.length === 0 || focusDirs.some(f => fullPath.includes(f)))) {
        await getFiles(fullPath, ext, files, exclude, focusDirs);
      }
    } else if (ext.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function categorizeFile(filePath: string): Node['category'] {
  if (filePath.includes('/app/')) return 'app';
  if (filePath.includes('/lib/')) return 'lib';
  if (filePath.includes('/components/')) return 'component';
  if (filePath.includes('/scripts/')) return 'script';
  if (['tsconfig.json', 'next.config.ts'].includes(path.basename(filePath))) return 'config';
  return 'misc';
}

function extractDesc(content: string): string {
  const match = content.match(/\/\/ (.*)|\/\*\*?\s*(.*?)\s*\*\//s);
  return match ? (match[1] || match[2]).trim().slice(0, 100) + '...' : 'No description found';
}

function extractExports(content: string): string[] {
  const matches = content.matchAll(/export (?:function|const|let|class|interface|type) (\w+)/g);
  return Array.from(matches, m => m[1]);
}

function extractImports(content: string): string[] {
  const matches = content.matchAll(/import .* from ['"](.*?)['"]/g);
  return Array.from(matches, m => m[1]);
}

function extractCalls(content: string): string[] {
  const matches = content.matchAll(/await\s+(\w+)\(/g);
  return Array.from(matches, m => m[1]);
}

function normalizeTarget(target: string): string {
  return target
    .replace(/^@\/|^\.\//, '')
    .replace(/\//g, '_')
    .replace(/\.(ts|tsx)$/, '_ts');
}

function assignToSubgraph(subgraphs: Graph['subgraphs'], id: string, category: string) {
  if (id.includes('phase1') && category === 'app') subgraphs.PhasePages.ids.push(id);
  if (id.includes('ai-actions')) subgraphs.AiActions.ids.push(id);
  if (id.includes('hook') || id.includes('utils')) subgraphs.HooksUtils.ids.push(id);
}

function calculateWeight(type: string, source: string, target: string): number {
  let weight = 1;
  if (type === 'import') weight += 4;
  if (type === 'call') weight += 7;
  if (source.includes('lib_') || target.includes('lib_')) weight += 2;
  return Math.min(weight, 10);
}

function generateMermaid(graph: Graph): string {
  let mermaid = 'graph TD\n';
  for (const edge of graph.edges) {
    mermaid += `  ${edge.source} -->|${edge.type} w${edge.weight}| ${edge.target}\n`;
  }
  for (const node of graph.nodes) {
    mermaid += `  ${node.id}["${node.id} (${node.category}${node.external ? ', ext' : ''}) - ${node.desc.slice(0, 20)}..."]\n`;
  }
  return mermaid;
}

if (process.argv[1] === path.resolve(__filename)) {
  generateGraph();
}