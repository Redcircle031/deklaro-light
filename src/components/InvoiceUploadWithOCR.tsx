'use client';

/**
 * Invoice Upload Component with Client-Side OCR
 *
 * Processes invoices in the browser using Tesseract.js before uploading.
 * This provides a free OCR solution without cloud dependencies.
 */

import { useState } from 'react';
import { useClientOCR } from '@/hooks/useClientOCR';

export function InvoiceUploadWithOCR() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const { processImage, isProcessing, progress, error } = useClientOCR();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    setUploadStatus('');
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadStatus('Please select files to upload');
      return;
    }

    setUploading(true);
    setUploadStatus('Processing invoices...');

    try {
      for (const file of selectedFiles) {
        // Step 1: Run OCR in browser
        setUploadStatus(`Processing OCR for ${file.name}...`);
        const ocrResult = await processImage(file);

        // Step 2: Upload file + OCR results to server
        setUploadStatus(`Uploading ${file.name}...`);

        const formData = new FormData();
        formData.append('files', file);
        formData.append('ocr_text', ocrResult.text);
        formData.append('ocr_confidence', ocrResult.confidence.toString());

        const response = await fetch('/api/invoices/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[Upload] Success:', result);
      }

      setUploadStatus(`✅ Successfully uploaded ${selectedFiles.length} invoice(s)`);
      setSelectedFiles([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setUploadStatus(`❌ Error: ${errorMessage}`);
      console.error('[Upload] Error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 p-6 border rounded-lg">
      <h2 className="text-2xl font-bold">Upload Invoices</h2>

      {/* File Input */}
      <div>
        <label className="block mb-2 font-medium">Select Invoice Files</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={handleFileSelect}
          disabled={uploading || isProcessing}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2"
        />
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div>
          <p className="text-sm text-gray-600">
            {selectedFiles.length} file(s) selected
          </p>
          <ul className="text-xs text-gray-500 mt-1">
            {selectedFiles.map((file, idx) => (
              <li key={idx}>
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* OCR Progress */}
      {isProcessing && (
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Processing OCR...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Messages */}
      {uploadStatus && (
        <div
          className={`p-3 rounded ${
            uploadStatus.includes('✅')
              ? 'bg-green-50 text-green-800'
              : uploadStatus.includes('❌')
                ? 'bg-red-50 text-red-800'
                : 'bg-blue-50 text-blue-800'
          }`}
        >
          {uploadStatus}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 rounded bg-red-50 text-red-800">
          OCR Error: {error}
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={selectedFiles.length === 0 || uploading || isProcessing}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {uploading || isProcessing ? 'Processing...' : 'Upload & Process'}
      </button>

      {/* Info */}
      <p className="text-xs text-gray-500">
        💡 OCR processing happens in your browser using Tesseract.js (free, private, no cloud costs)
      </p>
    </div>
  );
}
