declare module "pdf-parse" {
  interface PDFInfo {
    PDFFormatVersion: string;
    IsAcroFormPresent: boolean;
    IsXFAPresent: boolean;
    [key: string]: any;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: any;
    version: string;
    text: string;
  }

  type PDFParseOptions = {
    pagerender?: (pageData: any) => string;
    max?: number;
    version?: string;
  };

  function pdfParse(
    dataBuffer: Buffer | Uint8Array | ArrayBuffer,
    options?: PDFParseOptions
  ): Promise<PDFData>;

  export = pdfParse;
}
