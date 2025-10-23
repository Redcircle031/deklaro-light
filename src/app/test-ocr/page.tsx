import { InvoiceUploadWithOCR } from '@/components/InvoiceUploadWithOCR';

export default function TestOCRPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Test Client-Side OCR</h1>
      <InvoiceUploadWithOCR />
    </div>
  );
}
