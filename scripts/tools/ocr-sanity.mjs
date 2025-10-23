#!/usr/bin/env node
/**
 * Quick sanity runner for Tesseract.js.
 *
 * Usage:
 *   node scripts/tools/ocr-sanity.mjs ./path/to/sample.png
 */

import { createWorker } from "tesseract.js";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const [, , samplePathArg] = process.argv;
  if (!samplePathArg) {
    console.error("Usage: node scripts/tools/ocr-sanity.mjs <IMAGE_PATH>");
    process.exit(1);
  }

  const imagePath = resolve(__dirname, "..", "..", samplePathArg);
  const languages = process.env.NEXT_PUBLIC_TESSERACT_LANGUAGES ?? "pol+eng";

  const worker = await createWorker({
    cacheMethod: "readOnly",
    workerPath:
      process.env.NEXT_PUBLIC_TESSERACT_WORKER_PATH ??
      "https://unpkg.com/tesseract.js-core@5.0.0/dist/worker.min.js",
    corePath:
      process.env.NEXT_PUBLIC_TESSERACT_CORE_PATH ??
      "https://unpkg.com/tesseract.js-core@5.0.0/dist/tesseract-core.wasm.js",
    langPath:
      process.env.NEXT_PUBLIC_TESSERACT_LANG_PATH ??
      "https://unpkg.com/tesseract.js-core@5.0.0/dist/lang/",
  });

  console.log(`🔧 OCR sanity check`);
  console.log(`• image: ${imagePath}`);
  console.log(`• languages: ${languages}`);

  await worker.loadLanguage(languages);
  await worker.initialize(languages);
  const { data } = await worker.recognize(imagePath);
  await worker.terminate();

  console.log(`\nConfidence: ${data.confidence.toFixed(2)}`);
  console.log(`Preview:\n${data.text.trim().slice(0, 400)}\n`);
}

main().catch((error) => {
  console.error("OCR sanity run failed:", error);
  process.exit(1);
});
