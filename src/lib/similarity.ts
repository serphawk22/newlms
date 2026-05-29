/**
 * lib/similarity.ts
 *
 * Pure TypeScript similarity engine — no external dependencies.
 * Implements:
 *   1. TF-IDF Cosine Similarity  — for prose/essay documents
 *   2. Token Jaccard Similarity  — for code files (structure-aware)
 *   3. N-gram Shingling          — for detecting copied snippets
 *   4. LCS Snippet Extraction   — shows which passages are similar
 */

// ── Stop words (ignored in prose similarity) ─────────────────────────────────
const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
  "from","up","about","into","through","during","is","are","was","were","be",
  "been","being","have","has","had","do","does","did","will","would","could",
  "should","may","might","shall","can","need","dare","ought","used","it","its",
  "this","that","these","those","i","me","my","we","our","you","your","he","she",
  "him","her","they","them","their","what","which","who","whom","not","no","nor",
  "so","yet","both","either","neither","each","few","more","most","other","some",
  "such","than","too","very","just","because","if","as","while","although","since",
]);

const CODE_EXTENSIONS = new Set([
  "py","js","ts","jsx","tsx","java","c","cpp","h","cs","rb","php","go","rs",
  "swift","kt","scala","sh","bash","sql","r","m","vb","dart","lua","pl",
]);

export function isCodeFile(ext: string): boolean {
  return CODE_EXTENSIONS.has(ext.toLowerCase().replace(/^\./, ""));
}

// ── Tokenizers ───────────────────────────────────────────────────────────────

/** Tokenize prose text — lowercase, remove punctuation, filter stop words */
function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/** Tokenize code — normalizes whitespace/comments, keeps identifiers */
function tokenizeCode(code: string): string[] {
  return code
    // Remove single-line comments (// and #)
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/#[^\n]*/g, " ")
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/"""[\s\S]*?"""/g, " ")
    .replace(/'''[\s\S]*?'''/g, " ")
    // Normalize string literals → STRING_LITERAL token
    .replace(/"[^"]*"/g, " STRING_LITERAL ")
    .replace(/'[^']*'/g, " STRING_LITERAL ")
    // Keep identifiers and keywords
    .replace(/[^a-zA-Z0-9_$\s]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

// ── TF-IDF Cosine Similarity ──────────────────────────────────────────────────

function buildTermFreq(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  // Normalize by document length
  const len = tokens.length || 1;
  for (const [k, v] of freq) freq.set(k, v / len);
  return freq;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, normA = 0, normB = 0;
  for (const [term, freqA] of a) {
    normA += freqA * freqA;
    const freqB = b.get(term) ?? 0;
    dot += freqA * freqB;
  }
  for (const [, freqB] of b) normB += freqB * freqB;
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── Jaccard Similarity (for code) ────────────────────────────────────────────

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ── N-gram Shingling ──────────────────────────────────────────────────────────

function buildShingles(tokens: string[], n = 4): Set<string> {
  const shingles = new Set<string>();
  for (let i = 0; i <= tokens.length - n; i++) {
    shingles.add(tokens.slice(i, i + n).join(" "));
  }
  return shingles;
}

function shingleSimilarity(a: string[], b: string[], n = 4): number {
  if (a.length < n || b.length < n) return jaccardSimilarity(a, b);
  const shA = buildShingles(a, n);
  const shB = buildShingles(b, n);
  let intersection = 0;
  for (const s of shA) if (shB.has(s)) intersection++;
  const union = shA.size + shB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ── Snippet Matching ──────────────────────────────────────────────────────────

export interface MatchedSnippet {
  source: string;   // text from submission being checked
  target: string;   // text from the peer submission
  similarity: number;
}

/**
 * Splits text into sentences/lines and finds highly similar segments.
 * Returns up to 5 matched snippet pairs.
 */
function extractMatchedSnippets(textA: string, textB: string): MatchedSnippet[] {
  const splitIntoChunks = (text: string): string[] =>
    text
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.split(/\s+/).length >= 5); // at least 5 words

  const chunksA = splitIntoChunks(textA).slice(0, 100);
  const chunksB = splitIntoChunks(textB).slice(0, 100);

  const snippets: MatchedSnippet[] = [];

  for (const chunkA of chunksA) {
    const tokA = tokenizeText(chunkA);
    if (tokA.length < 4) continue;
    const freqA = buildTermFreq(tokA);

    let bestSim = 0;
    let bestChunkB = "";

    for (const chunkB of chunksB) {
      const tokB = tokenizeText(chunkB);
      if (tokB.length < 4) continue;
      const freqB = buildTermFreq(tokB);
      const sim = cosineSimilarity(freqA, freqB);
      if (sim > bestSim) { bestSim = sim; bestChunkB = chunkB; }
    }

    if (bestSim >= 0.7) {
      snippets.push({
        source: chunkA.slice(0, 200),
        target: bestChunkB.slice(0, 200),
        similarity: Math.round(bestSim * 100) / 100,
      });
      if (snippets.length >= 5) break;
    }
  }

  return snippets;
}

// ── Main API ──────────────────────────────────────────────────────────────────

export interface SimilarityMatch {
  submissionId: string;
  studentName: string;
  similarityPct: number;    // 0–100
  matchedSnippets: MatchedSnippet[];
}

export interface SimilarityReport {
  overallScore: number;       // highest similarity against any peer (0–100)
  plagiarismStatus: "SAFE" | "MEDIUM" | "HIGH";
  matches: SimilarityMatch[];
}

export interface PeerDocument {
  submissionId: string;
  studentName: string;
  text: string;
  ext: string;
}

/**
 * Compare one document against a list of peer documents.
 * Returns a full similarity report.
 */
export function computeSimilarity(
  targetText: string,
  targetExt: string,
  peers: PeerDocument[]
): SimilarityReport {
  if (!targetText.trim() || peers.length === 0) {
    return { overallScore: 0, plagiarismStatus: "SAFE", matches: [] };
  }

  const useCode = isCodeFile(targetExt);
  const tokensTarget = useCode ? tokenizeCode(targetText) : tokenizeText(targetText);

  const matches: SimilarityMatch[] = [];

  for (const peer of peers) {
    if (!peer.text.trim()) continue;

    const peerCode = isCodeFile(peer.ext);
    const tokensPeer = peerCode ? tokenizeCode(peer.text) : tokenizeText(peer.text);

    // Compute multiple similarity measures and take the max
    let sim = 0;

    // 1. Cosine similarity
    const freqTarget = buildTermFreq(tokensTarget);
    const freqPeer   = buildTermFreq(tokensPeer);
    const cosine     = cosineSimilarity(freqTarget, freqPeer);
    sim = Math.max(sim, cosine);

    // 2. Jaccard similarity
    const jaccard = jaccardSimilarity(tokensTarget, tokensPeer);
    sim = Math.max(sim, jaccard);

    // 3. Shingle similarity (n-grams, catches reordered content)
    const shingle = shingleSimilarity(tokensTarget, tokensPeer, 4);
    sim = Math.max(sim, shingle);

    // Weighted average leans toward cosine (most reliable for prose)
    const weighted = (cosine * 0.5 + jaccard * 0.3 + shingle * 0.2);
    const pct = Math.min(100, Math.round(weighted * 100));

    if (pct >= 5) { // only include if meaningfully similar
      const snippets = extractMatchedSnippets(targetText, peer.text);
      matches.push({
        submissionId: peer.submissionId,
        studentName: peer.studentName,
        similarityPct: pct,
        matchedSnippets: snippets,
      });
    }
  }

  // Sort by similarity descending
  matches.sort((a, b) => b.similarityPct - a.similarityPct);

  const overallScore = matches.length > 0 ? matches[0].similarityPct : 0;
  const plagiarismStatus: "SAFE" | "MEDIUM" | "HIGH" =
    overallScore > 50 ? "HIGH" :
    overallScore > 20 ? "MEDIUM" : "SAFE";

  return { overallScore, plagiarismStatus, matches: matches.slice(0, 10) };
}
