import type { OcrConfig } from "./types";

const DEFAULT_TESSERACT_ASSET_ROOT =
  process.env.NEXT_PUBLIC_TESSERACT_ASSET_ROOT ??
  "https://unpkg.com/tesseract.js-core@5.0.0/dist/";

export const OCR_CONFIG: OcrConfig = {
  languages: process.env.NEXT_PUBLIC_TESSERACT_LANGUAGES ?? "pol+eng",
  psm: Number(process.env.NEXT_PUBLIC_TESSERACT_PSM ?? 3),
  oem: Number(process.env.NEXT_PUBLIC_TESSERACT_OEM ?? 1),
};

export const TESSERACT_ASSETS = {
  workerPath:
    process.env.NEXT_PUBLIC_TESSERACT_WORKER_PATH ??
    `${DEFAULT_TESSERACT_ASSET_ROOT}worker.min.js`,
  langPath:
    process.env.NEXT_PUBLIC_TESSERACT_LANG_PATH ??
    `${DEFAULT_TESSERACT_ASSET_ROOT}lang/`,
  corePath:
    process.env.NEXT_PUBLIC_TESSERACT_CORE_PATH ??
    `${DEFAULT_TESSERACT_ASSET_ROOT}tesseract-core.wasm.js`,
};
