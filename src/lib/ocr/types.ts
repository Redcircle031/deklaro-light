export type OcrWord = {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
};

export type OcrResult = {
  text: string;
  confidence: number;
  words: OcrWord[];
  language: string;
  metadata?: {
    pages?: number;
    durationMs?: number;
    raw?: unknown;
  };
};

export type OcrConfig = {
  languages: string;
  psm: number;
  oem: number;
};

