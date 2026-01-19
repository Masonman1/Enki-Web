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

async function flattenDir(baseDir: string, currentDir: string, outputDir: string, flattenedCount: number = 0) {
  try {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    if (path.resolve(currentDir) === path.resolve(output)) {
  console.log(`Skipping output dir: ${output}`);
  return flattenedCount;  // Exit early without processing
}
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
        // Enhanced deletion: Fully rm dir, handle Windows locks/metadata, and recreate
    try {
      await fs.rm(output, { recursive: true, force: true });
      console.log(`Output dir ${output} fully deleted (if existed)`);
    } catch (rmErr) {
      console.error(`Deletion error: ${rmErr.message} - Falling back to manual clear`);
      // Fallback: List and unlink files if rm fails (e.g., stubborn Windows files)
      const files = await fs.readdir(output).catch(() => []); // Safe if dir missing
      for (const file of files) {
        await fs.unlink(path.join(output, file)).catch(err => console.warn(`Skip unlink ${file}: ${err.message}`));
      }
      await fs.rm(output, { recursive: true, force: true }); // Retry rm
    }
    await fs.mkdir(output, { recursive: true });
    console.log(`Output dir ${output} recreated fresh`);
   
    
    const count = await flattenDir(dir, dir, output);
    console.log(`Flattening complete—${count} files saved to: ${path.resolve(output)}`);
    console.log('Tip: Check for encoded names like app_dashboard_page.tsx (run from apps/web/ for full paths)');
  } catch (err) {
    console.error('Script error:', err.message);
  }
})();