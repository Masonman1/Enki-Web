import fs from 'fs/promises';
import path from 'path';
import { program } from 'commander';

program
  .option('--dir <path>', 'Directory to flatten', '.')  // Default to current dir for easier testing
  .option('--output <path>', 'Output dir for flattened files', 'flattened-attachments');  // Default output

program.parse();
const { dir } = program.opts();  // 'output' is const now
const output = program.opts().output;  // Separate for clarity, but const

// Make dir absolute to avoid Windows path issues
const resolvedDir = path.resolve(dir);

async function flattenDir(baseDir: string, currentDir: string, outputDir: string, flattenedCount: number = 0) {
  try {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      // Skip hidden/system dirs to reduce noise (e.g., .git, node_modules)
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          console.log(`Skipping dir: ${entry.name}`);
          continue;
        }
        flattenedCount = await flattenDir(baseDir, fullPath, outputDir, flattenedCount);  // Recurse
      } else {
        // Encode relative path with underscores (replace / or \ with _)
        const relPath = path.relative(baseDir, fullPath).replace(/[\/\\]/g, '_');
        if (relPath) {  // Skip if empty (root files)
          const outPath = path.join(outputDir, relPath);
          await fs.mkdir(path.dirname(outPath), { recursive: true });
          await fs.copyFile(fullPath, outPath);
          console.log(`Flattened: ${relPath}`);
          flattenedCount++;
        }
      }
    }
    return flattenedCount;
  } catch (err) {
    console.error(`Error flattening ${currentDir}:`, err.message);
    return flattenedCount;
  }
}

(async () => {
  try {
    await fs.mkdir(output, { recursive: true });
    const count = await flattenDir(resolvedDir, resolvedDir, output);
    console.log(`Flattening complete—${count} files saved to: ${path.resolve(output)}`);
    console.log('Tip: Check for encoded names like app_dashboard_page.tsx (run from apps/web/ for full paths)');
  } catch (err) {
    console.error('Script error:', err.message);
  }
})();