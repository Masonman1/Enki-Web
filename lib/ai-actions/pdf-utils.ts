// lib/ai-actions/pdf-utils.ts
// Extracted PDF handling for text extraction and splitting

import pdf from 'pdf-parse';
import { PDFDocument } from 'pdf-lib';

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { text } = await pdf(buffer);
  return text;
}

export async function splitPdfByRanges(originalBuffer: Buffer, splits: ParsedSplit): Promise<Record<string, Buffer>> {
  const originalPdf = await PDFDocument.load(originalBuffer);
  const splitBuffers: Record<string, Buffer> = {};

  for (const [section, range] of Object.entries(splits)) {
    const [start, end] = range.split('-').map(Number);
    const splitPdf = await PDFDocument.create();

try {
  const pages = await splitPdf.copyPages(originalPdf, Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i));
  pages.forEach(page => splitPdf.addPage(page));
} catch (pdfErr) {
  console.warn(`PDF split warning for ${section}:`, pdfErr.message);
  continue; // Skip bad section
}

    const splitBytes = await splitPdf.save(); // Get Uint8Array
    console.log('Using Buffer.from for split')
    splitBuffers[section] = Buffer.from(splitBytes); // Explicit from Uint8Array—no legacy Buffer()
  }

  return splitBuffers;
}

// Interfaces (duplicated here for modularity; could centralize later)
interface ParsedSplit {
  [section: string]: string; // e.g., { "schedule": "156-160" }
}