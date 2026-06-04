declare module "pdf-parse" {
  interface PDFInfo {
    PDFFormatVersion: string;
    IsAcroFormPresent: boolean;
    IsXFAPresent: boolean;
    [key: string]: unknown;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: Record<string, unknown> | null;
    version: string;
    text: string;
  }

  type PDFParseOptions = {
    pagerender?: (pageData: { getTextContent: () => Promise<unknown> }) => string;
    max?: number;
    version?: string;
  };

  function pdfParse(
    dataBuffer: Buffer | Uint8Array | ArrayBuffer,
    options?: PDFParseOptions
  ): Promise<PDFData>;

  export = pdfParse;
}
