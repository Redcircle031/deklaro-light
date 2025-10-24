"use client";

import { useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Invoice } from "@prisma/client";

export function InvoiceUploader({
  onUploadSuccess,
}: {
  onUploadSuccess: (invoice: Invoice) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getBrowserSupabaseClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // 1. Get user and tenant information for the file path
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("User is not authenticated.");

      // In a real app, tenantId would come from a context or cookie
      const tenantId = "tenant-placeholder";
      const filePath = `${tenantId}/${session.user.id}/${Date.now()}-${file.name}`;

      // 2. Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("invoices") // Bucket name
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("invoices").getPublicUrl(filePath);

      // 4. Create the invoice record in our database via our API
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalFileUrl: publicUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create invoice record.");
      }

      const newInvoice = await response.json();
      onUploadSuccess(newInvoice);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Upload New Invoice</h2>
      <input type="file" onChange={handleFileChange} disabled={uploading} className="mt-4" />
      {uploading ? <p className="mt-2 text-sm text-blue-600">Uploading...</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}