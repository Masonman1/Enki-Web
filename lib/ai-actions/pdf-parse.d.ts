// NEW FILE: lib/ai-actions/pdf-parse.d.ts (Add this file to provide type declarations for 'pdf-parse' and fix implicit 'any' error)

declare module 'pdf-parse' {
  interface PDFParseOptions {
    pagerender?: (pageData: unknown) => string; // UPDATED: any → unknown
    max?: number;
    version?: 'default' | 'v1.10.100' | 'v1.9.426' | 'v2.0.550';
  }

  interface PDFParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: unknown; // UPDATED: any → unknown
    metadata: unknown; // UPDATED: any → unknown
    version: string;
  }

  function pdf(dataBuffer: Buffer, options?: PDFParseOptions): Promise<PDFParseResult>;

  export = pdf;
}