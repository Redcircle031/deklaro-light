'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type UploadedFile = {
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
  abortController?: AbortController;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 50;
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/tiff', 'application/pdf'];

export function InvoiceUpload() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  }, []);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return `Invalid file type. Only ${ACCEPTED_FILE_TYPES.join(', ')} are allowed.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 10MB limit (${formatFileSize(file.size)})`;
    }
    return null;
  };

  const addFiles = (newFiles: File[]) => {
    // Check total file limit
    const remainingSlots = MAX_FILES - files.length;
    if (remainingSlots <= 0) {
      alert(`Maximum ${MAX_FILES} files allowed. Please remove some files first.`);
      return;
    }

    const filesToAdd = newFiles.slice(0, remainingSlots);

    if (newFiles.length > remainingSlots) {
      alert(`Only adding ${remainingSlots} files. Maximum ${MAX_FILES} files allowed.`);
    }

    const uploadedFiles: UploadedFile[] = filesToAdd.map((file) => {
      const error = validateFile(file);
      return {
        file,
        preview: file.type.startsWith('image/') && !error ? URL.createObjectURL(file) : undefined,
        status: error ? 'error' as const : 'pending' as const,
        progress: 0,
        error: error || undefined,
      };
    });

    setFiles((prev) => [...prev, ...uploadedFiles]);
  };

  const uploadFile = async (uploadedFile: UploadedFile, index: number) => {
    const abortController = new AbortController();

    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, status: 'uploading' as const, abortController } : f)),
    );

    try {
      const formData = new FormData();
      formData.append('files', uploadedFile.file);

      // TODO: Replace with actual API endpoint once database is connected
      const response = await fetch('/api/invoices/upload', {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? { ...f, status: 'processing' as const, progress: 50 }
            : f,
        ),
      );

      // Simulate OCR processing
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, status: 'complete' as const, progress: 100 } : f,
          ),
        );
      }, 2000);
    } catch (error) {
      // Don't show error if upload was cancelled
      if (error instanceof Error && error.name === 'AbortError') {
        setFiles((prev) =>
          prev.map((f, i) => (i === index ? { ...f, status: 'pending' as const, progress: 0 } : f)),
        );
        return;
      }

      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f,
        ),
      );
    }
  };

  const cancelUpload = (index: number) => {
    const file = files[index];
    if (file.abortController && file.status === 'uploading') {
      file.abortController.abort();
    }
  };

  const handleUploadAll = () => {
    files.forEach((file, index) => {
      if (file.status === 'pending') {
        uploadFile(file, index);
      }
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative rounded-lg border-2 border-dashed p-8 text-center transition-colors
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
              : 'border-gray-300 hover:border-gray-400 dark:border-gray-700'
          }
        `}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          accept="image/jpeg,image/png,image/jpg,image/tiff,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          <svg
            className="h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          <div>
            <label
              htmlFor="file-upload"
              className="cursor-pointer font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Click to upload
            </label>
            <span className="text-gray-600 dark:text-gray-400"> or drag and drop</span>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            PDF, JPG, PNG, or TIFF up to 10MB (max 50 files)
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </h3>
            <button
              onClick={handleUploadAll}
              disabled={!files.some((f) => f.status === 'pending')}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-700"
            >
              Upload All
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((uploadedFile, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg border bg-white p-3 dark:bg-gray-900"
              >
                {/* Preview or Icon */}
                {uploadedFile.preview ? (
                  <img
                    src={uploadedFile.preview}
                    alt="Preview"
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
                    <svg
                      className="h-6 w-6 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{uploadedFile.file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>

                  {/* Progress Bar */}
                  {uploadedFile.status !== 'pending' && uploadedFile.status !== 'error' && (
                    <div className="mt-1 h-1 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{ width: `${uploadedFile.progress}%` }}
                      />
                    </div>
                  )}

                  {uploadedFile.error && (
                    <p className="text-xs text-red-600 mt-1">{uploadedFile.error}</p>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  {uploadedFile.status === 'pending' && (
                    <span className="text-xs text-gray-500">Pending</span>
                  )}
                  {uploadedFile.status === 'uploading' && (
                    <>
                      <span className="text-xs text-blue-600">Uploading...</span>
                      <button
                        onClick={() => cancelUpload(index)}
                        className="text-xs text-red-600 hover:underline"
                        aria-label="Cancel upload"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {uploadedFile.status === 'processing' && (
                    <span className="text-xs text-yellow-600">Processing...</span>
                  )}
                  {uploadedFile.status === 'complete' && (
                    <span className="text-xs text-green-600">✓ Complete</span>
                  )}
                  {uploadedFile.status === 'error' && (
                    <>
                      <span className="text-xs text-red-600">✗ Failed</span>
                      <button
                        onClick={() => {
                          setFiles((prev) =>
                            prev.map((f, i) =>
                              i === index ? { ...f, status: 'pending' as const, error: undefined } : f
                            )
                          );
                        }}
                        className="text-xs text-blue-600 hover:underline"
                        aria-label="Retry upload"
                      >
                        Retry
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => removeFile(index)}
                    disabled={uploadedFile.status === 'uploading' || uploadedFile.status === 'processing'}
                    className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Remove file"
                  >
                    <svg
                      className="h-4 w-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
