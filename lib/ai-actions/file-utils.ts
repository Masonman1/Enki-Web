// lib/ai-actions/file-utils.ts (renamed from pdf-utils.ts)
import pdf from 'pdf-parse';
import { PDFDocument } from 'pdf-lib';
import MsgReader from '@kenjiuno/msgreader'; // NEW: Import for .msg

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { text } = await pdf(buffer);
  return text;
}

export async function extractMsgText(buffer: Buffer): Promise<string> {
  const testMsg = new MsgReader(buffer);
  const info = testMsg.getFileData();
  return info.body || ''; // Fallback to empty if no body; use info.htmlBody if HTML needed (strip tags manually if required)
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
    } catch (pdfErr: unknown) {
      const errorMsg = pdfErr instanceof Error ? pdfErr.message : 'Unknown PDF error';
      console.warn(`PDF split warning for ${section}:`, errorMsg);
      continue; // Skip bad section
    }

    const splitBytes = await splitPdf.save();
    splitBuffers[section] = Buffer.from(splitBytes);
  }

  return splitBuffers;
}

// Interfaces unchanged
interface ParsedSplit {
  [section: string]: string; // e.g., { "schedule": "156-160" }
}