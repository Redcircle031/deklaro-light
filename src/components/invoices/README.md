# Invoice Upload Component

## InvoiceUpload

A full-featured drag-and-drop invoice upload component with file validation, progress tracking, and batch upload support.

### Features

- **Drag & Drop**: Intuitive drag-and-drop interface
- **File Selection**: Click to browse and select files
- **File Validation**:
  - Type validation (PDF, JPG, PNG, TIFF only)
  - Size validation (10MB maximum per file)
  - Batch limit (50 files maximum)
- **Progress Tracking**: Visual progress bars for each file
- **Batch Upload**: Upload multiple files simultaneously
- **Upload Cancellation**: Cancel uploads in progress
- **Retry Failed Uploads**: Retry button for failed uploads
- **File Previews**: Image thumbnails for supported formats
- **Error Handling**: Clear error messages with validation feedback

### Usage

```tsx
import { InvoiceUpload } from '@/components/invoices/InvoiceUpload';

export default function UploadPage() {
  return (
    <div>
      <h1>Upload Invoices</h1>
      <InvoiceUpload />
    </div>
  );
}
```

### File Constraints

| Constraint | Value |
|------------|-------|
| Max file size | 10 MB |
| Max files per batch | 50 files |
| Accepted formats | PDF, JPG, PNG, TIFF |

### File States

Each uploaded file progresses through these states:

1. **Pending** - File added, waiting for upload
2. **Uploading** - File being uploaded to server
3. **Processing** - OCR and AI extraction in progress
4. **Complete** - Successfully processed
5. **Error** - Upload or processing failed

### API Integration

The component expects an API endpoint at `/api/invoices/upload` that accepts:

**Request:**
- Method: `POST`
- Body: `FormData` with `file` field
- Signal: `AbortSignal` for cancellation support

**Response:**
```json
{
  "success": true,
  "invoiceId": "uuid",
  "message": "Invoice uploaded successfully"
}
```

### Component Structure

```
InvoiceUpload/
├── Drop Zone
│   ├── Visual indicator (drag state)
│   ├── Upload icon
│   └── Instructions
├── File List
│   ├── File preview/icon
│   ├── File info (name, size)
│   ├── Progress bar
│   ├── Status indicator
│   └── Action buttons (cancel/retry/remove)
└── Upload All button
```

### Keyboard & Accessibility

- ✅ ARIA labels on all interactive elements
- ✅ Focus management
- ✅ Keyboard navigation support
- ✅ Screen reader friendly

### Styling

Uses Tailwind CSS with dark mode support. All colors and spacing follow the design system.

### Future Enhancements

- [ ] WebSocket for real-time OCR progress updates
- [ ] Thumbnail generation for PDF files
- [ ] Bulk operations (remove all, retry all)
- [ ] Upload queue management
- [ ] Drag-to-reorder files
