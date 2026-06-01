/**
 * Ambient type declarations for the Web Speech API (SpeechRecognition).
 *
 * These are NOT part of TypeScript's standard lib.dom.d.ts for all targets,
 * and window.webkitSpeechRecognition is never included.
 *
 * Because this file has no imports/exports it is treated as an ambient
 * script: every interface declared here merges into the global scope,
 * so components can use ISpeechRecognition, ISpeechRecognitionEvent, etc.
 * without any import statement.
 */

// ── Result types ─────────────────────────────────────────────────────────────

interface ISpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface ISpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): ISpeechRecognitionAlternative;
  [index: number]: ISpeechRecognitionAlternative;
}

interface ISpeechRecognitionResultList {
  readonly length: number;
  item(index: number): ISpeechRecognitionResult;
  [index: number]: ISpeechRecognitionResult;
}

// ── Events ────────────────────────────────────────────────────────────────────

interface ISpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: ISpeechRecognitionResultList;
}

/**
 * All documented error codes for the SpeechRecognitionErrorEvent.
 * Typed as a union of literals + string so future codes don't break narrowing.
 */
type SpeechRecognitionErrorCode =
  | "aborted"
  | "audio-capture"
  | "bad-grammar"
  | "language-not-supported"
  | "network"
  | "no-speech"
  | "not-allowed"
  | "permission-denied"
  | "service-not-allowed"
  | "interrupted"
  | "canceled"
  | (string & Record<never, never>); // keeps exhaustiveness without closing the union

interface ISpeechRecognitionErrorEvent extends Event {
  readonly error: SpeechRecognitionErrorCode;
  readonly message: string;
}

// ── Main interface ────────────────────────────────────────────────────────────

interface ISpeechRecognition extends EventTarget {
  // Config (must be set before start())
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;

  // Control
  start(): void;
  stop(): void;
  abort(): void;

  // Lifecycle handlers
  onstart:       ((this: ISpeechRecognition, ev: Event) => void) | null;
  onend:         ((this: ISpeechRecognition, ev: Event) => void) | null;
  onaudiostart:  ((this: ISpeechRecognition, ev: Event) => void) | null;
  onaudioend:    ((this: ISpeechRecognition, ev: Event) => void) | null;
  onsoundstart:  ((this: ISpeechRecognition, ev: Event) => void) | null;
  onsoundend:    ((this: ISpeechRecognition, ev: Event) => void) | null;
  onspeechstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onspeechend:   ((this: ISpeechRecognition, ev: Event) => void) | null;

  // Result / error handlers
  onresult: ((this: ISpeechRecognition, ev: ISpeechRecognitionEvent) => void) | null;
  onerror:  ((this: ISpeechRecognition, ev: ISpeechRecognitionErrorEvent) => void) | null;
  onnomatch: ((this: ISpeechRecognition, ev: ISpeechRecognitionEvent) => void) | null;
}

interface ISpeechRecognitionConstructor {
  new(): ISpeechRecognition;
  readonly prototype: ISpeechRecognition;
}

// ── Window augmentation ───────────────────────────────────────────────────────
// Merges into the global Window interface — no `declare global` needed in
// an ambient (.d.ts) file that has no imports/exports.

interface Window {
  /** Standard W3C — available in Chrome 33+, Edge 79+ */
  SpeechRecognition?: ISpeechRecognitionConstructor;
  /** Webkit-prefixed fallback — still required for many Chrome/Edge versions */
  webkitSpeechRecognition?: ISpeechRecognitionConstructor;
}
