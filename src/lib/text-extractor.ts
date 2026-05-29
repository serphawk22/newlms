/**
 * lib/text-extractor.ts
 *
 * Extracts plain text from various file types without heavy external dependencies.
 * Supports: txt, all code files, json, csv, pdf (basic), docx (basic), xlsx (basic).
 */

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "rtf",
  // Code
  "js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "h", "cs",
  "rb", "php", "go", "rs", "swift", "kt", "scala", "sh", "bash",
  "sql", "r", "m", "vb", "dart", "lua", "pl",
  // Data
  "json", "xml", "yaml", "yml", "toml", "ini", "env",
  "csv", "tsv", "log",
  // Web
  "html", "htm", "css", "scss", "sass", "less",
]);

const TEXT_MIME_PREFIXES = ["text/", "application/json", "application/xml", "application/javascript"];

function isTextFile(ext: string, mime: string): boolean {
  return TEXT_EXTENSIONS.has(ext.toLowerCase()) ||
    TEXT_MIME_PREFIXES.some((p) => mime.toLowerCase().startsWith(p));
}

// ── Advanced PDF text extraction using pdf-parse ──────────────────────
import pdf from "pdf-parse";

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  try {
    const pdfBuffer = Buffer.from(buffer);
    const result = await pdf(pdfBuffer);
    return result.text || "[PDF content could not be extracted]";
  } catch (err) {
    console.error("[extractPdfText] pdf-parse failed, falling back to basic extraction:", err);
    // Basic fallback if pdf-parse fails
    try {
      const bytes = new Uint8Array(buffer);
      const text = new TextDecoder("latin1").decode(bytes);
      const chunks: string[] = [];
      const tjRegex = /\(([^)]{1,500})\)\s*(?:Tj|'|")/g;
      const tjArrRegex = /\[([^\]]{1,2000})\]\s*TJ/g;
      let m: RegExpExecArray | null;
      while ((m = tjRegex.exec(text)) !== null) {
        const s = m[1]
          .replace(/\\n/g, " ").replace(/\\r/g, " ").replace(/\\t/g, " ")
          .replace(/\\\(/g, "(").replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\");
        if (/[a-zA-Z0-9]{2,}/.test(s)) chunks.push(s);
      }
      while ((m = tjArrRegex.exec(text)) !== null) {
        const inner = m[1].replace(/\([^)]*\)/g, (p) => p.slice(1, -1)).replace(/-?\d+/g, " ");
        if (/[a-zA-Z0-9]{2,}/.test(inner)) chunks.push(inner);
      }
      const result = chunks.join(" ").replace(/\s+/g, " ").trim();
      return result || "[PDF content could not be extracted]";
    } catch {
      return "[PDF extraction failed]";
    }
  }
}

// ── Basic DOCX text extraction (DOCX = ZIP containing XML) ──────────────────
// Reads word/document.xml from ZIP and strips XML tags
async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  try {
    // DOCX is a ZIP file. Look for the PK header and try to find "word/document.xml"
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder("utf-8", { fatal: false });

    // Convert to string looking for XML content patterns
    const raw = decoder.decode(bytes);

    // Find XML-like text blocks (word/document.xml content)
    const xmlMatch = raw.match(/word\/document\.xml[^<]*(<\?xml[\s\S]*?<\/w:document>)/);
    if (xmlMatch) {
      const xml = xmlMatch[1];
      // Strip XML tags, decode entities
      return xml
        .replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, "$1 ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/\s+/g, " ").trim();
    }

    // Fallback: extract any readable ASCII text from binary
    const ascii = raw.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
    const words = ascii.split(/\s+/).filter((w) => /^[a-zA-Z]{3,}/.test(w));
    return words.slice(0, 2000).join(" ") || "[DOCX content could not be extracted]";
  } catch {
    return "[DOCX extraction failed]";
  }
}

// ── Basic XLSX text extraction ───────────────────────────────────────────────
async function extractXlsxText(buffer: ArrayBuffer): Promise<string> {
  try {
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(new Uint8Array(buffer));

    // Find xl/sharedStrings.xml content (where cell text is stored)
    const ssMatch = raw.match(/xl\/sharedStrings\.xml[^<]*(<\?xml[\s\S]*?<\/sst>)/);
    if (ssMatch) {
      return ssMatch[1]
        .replace(/<t[^>]*>([^<]*)<\/t>/g, "$1 ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ").trim();
    }

    // Fallback: extract readable words
    const ascii = raw.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ");
    const words = ascii.split(/\s+/).filter((w) => /^[a-zA-Z0-9]{2,}/.test(w));
    return words.slice(0, 2000).join(" ") || "[XLSX content could not be extracted]";
  } catch {
    return "[XLSX extraction failed]";
  }
}

// ── Main extractor ───────────────────────────────────────────────────────────

export interface ExtractionResult {
  text: string;
  method: string;
  wordCount: number;
}

export async function extractTextFromUrl(
  url: string,
  ext: string,
  mime: string
): Promise<ExtractionResult> {
  const normalExt = ext.toLowerCase().replace(/^\./, "");
  const normalMime = mime.toLowerCase();

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "LMS-Plagiarism-Checker/1.0" },
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      return { text: "", method: "fetch-error", wordCount: 0 };
    }

    // ── Plain text / code files ───────────────────────────────────────────
    if (isTextFile(normalExt, normalMime)) {
      const text = await response.text();
      const cleaned = text.replace(/\r\n/g, "\n").trim();
      return {
        text: cleaned,
        method: "text",
        wordCount: cleaned.split(/\s+/).filter(Boolean).length,
      };
    }

    const buffer = await response.arrayBuffer();

    // ── PDF ───────────────────────────────────────────────────────────────
    if (normalExt === "pdf" || normalMime === "application/pdf") {
      const text = await extractPdfText(buffer);
      return {
        text,
        method: "pdf-parse",
        wordCount: text.split(/\s+/).filter(Boolean).length,
      };
    }

    // ── DOCX ──────────────────────────────────────────────────────────────
    if (
      normalExt === "docx" ||
      normalMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const text = await extractDocxText(buffer);
      return {
        text,
        method: "docx-basic",
        wordCount: text.split(/\s+/).filter(Boolean).length,
      };
    }

    // ── XLSX ──────────────────────────────────────────────────────────────
    if (
      normalExt === "xlsx" ||
      normalMime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      const text = await extractXlsxText(buffer);
      return {
        text,
        method: "xlsx-basic",
        wordCount: text.split(/\s+/).filter(Boolean).length,
      };
    }

    // ── DOC (legacy Word) ─────────────────────────────────────────────────
    if (normalExt === "doc" || normalMime === "application/msword") {
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const raw = decoder.decode(new Uint8Array(buffer));
      const words = raw
        .replace(/[^\x20-\x7E\n]/g, " ")
        .split(/\s+/)
        .filter((w) => /^[a-zA-Z]{3,}/.test(w));
      const text = words.slice(0, 3000).join(" ");
      return { text, method: "doc-binary", wordCount: words.length };
    }

    // ── CSV / TSV fallback ────────────────────────────────────────────────
    if (normalExt === "csv" || normalExt === "tsv") {
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const text = decoder.decode(new Uint8Array(buffer));
      return {
        text: text.replace(/[,;"\t]/g, " ").replace(/\s+/g, " ").trim(),
        method: "csv",
        wordCount: text.split(/\s+/).filter(Boolean).length,
      };
    }

    // ── PPT/PPTX ──────────────────────────────────────────────────────────
    if (normalExt === "pptx" || normalExt === "ppt") {
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const raw = decoder.decode(new Uint8Array(buffer));
      const text = raw
        .replace(/<a:t[^>]*>([^<]*)<\/a:t>/g, "$1 ")
        .replace(/<[^>]+>/g, " ")
        .replace(/[^\x20-\x7E\n]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return {
        text,
        method: "pptx-basic",
        wordCount: text.split(/\s+/).filter(Boolean).length,
      };
    }

    // ── Fallback: try to read binary as best-effort text ──────────────────
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(new Uint8Array(buffer));
    const words = raw
      .replace(/[^\x20-\x7E\n\r\t]/g, " ")
      .split(/\s+/)
      .filter((w) => /^[a-zA-Z0-9]{3,}/.test(w));
    const text = words.slice(0, 2000).join(" ");
    return {
      text,
      method: "binary-fallback",
      wordCount: words.length,
    };
  } catch (err) {
    console.error("[text-extractor] Failed for URL:", url, err);
    return { text: "", method: "error", wordCount: 0 };
  }
}
