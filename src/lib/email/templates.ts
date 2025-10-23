/**
 * Email Templates
 * HTML email templates for all notification types
 */

export interface OCRCompletedEmailData {
  userName: string;
  invoiceCount: number;
  successCount: number;
  failedCount: number;
  tenantName: string;
  dashboardUrl: string;
}

export interface KSeFSubmissionEmailData {
  userName: string;
  invoiceNumber: string;
  ksefNumber?: string;
  success: boolean;
  errorMessage?: string;
  tenantName: string;
  invoiceUrl: string;
}

export interface ManualReviewEmailData {
  userName: string;
  invoiceNumber: string;
  companyName: string;
  confidence: number;
  tenantName: string;
  reviewUrl: string;
}

export interface MonthlyDigestEmailData {
  userName: string;
  tenantName: string;
  period: string;
  stats: {
    totalInvoices: number;
    processedInvoices: number;
    ksefSubmissions: number;
    newCompanies: number;
  };
  dashboardUrl: string;
}

/**
 * Base email template with header and footer
 */
function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deklaro Notification</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 30px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 500;
    }
    .button:hover {
      background: #5568d3;
    }
    .stats {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
    }
    .stat-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .stat-item:last-child {
      border-bottom: none;
    }
    .stat-label {
      font-weight: 500;
      color: #666;
    }
    .stat-value {
      font-weight: 600;
      color: #333;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #666;
    }
    .alert {
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }
    .alert-success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .alert-error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    .alert-warning {
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧾 Deklaro</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Deklaro - AI-powered invoice management for Polish SMEs</p>
      <p style="font-size: 12px; margin-top: 10px;">
        Nie odpowiadaj na tę wiadomość. W razie pytań skontaktuj się z nami na support@deklaro.app
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * OCR Processing Completed Email
 */
export function ocrCompletedEmail(data: OCRCompletedEmailData): string {
  const content = `
    <h2>Przetwarzanie faktur zakończone</h2>
    <p>Witaj ${data.userName},</p>
    <p>Zakończyliśmy przetwarzanie Twoich faktur za pomocą OCR i AI.</p>

    <div class="stats">
      <div class="stat-item">
        <span class="stat-label">Przesłane faktury:</span>
        <span class="stat-value">${data.invoiceCount}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Pomyślnie przetworzone:</span>
        <span class="stat-value" style="color: #28a745;">${data.successCount}</span>
      </div>
      ${data.failedCount > 0 ? `
      <div class="stat-item">
        <span class="stat-label">Wymagające uwagi:</span>
        <span class="stat-value" style="color: #dc3545;">${data.failedCount}</span>
      </div>
      ` : ''}
    </div>

    ${data.successCount > 0 ? `
      <div class="alert alert-success">
        ✅ <strong>${data.successCount}</strong> faktur zostało pomyślnie przetworzonych i jest gotowych do przeglądu.
      </div>
    ` : ''}

    ${data.failedCount > 0 ? `
      <div class="alert alert-warning">
        ⚠️ <strong>${data.failedCount}</strong> faktur wymaga ręcznego przeglądu ze względu na niską pewność rozpoznania.
      </div>
    ` : ''}

    <p>
      <a href="${data.dashboardUrl}" class="button">Przejdź do panelu</a>
    </p>

    <p style="color: #666; font-size: 14px;">Tenant: ${data.tenantName}</p>
  `;

  return baseTemplate(content);
}

/**
 * KSeF Submission Result Email
 */
export function ksefSubmissionEmail(data: KSeFSubmissionEmailData): string {
  const content = data.success
    ? `
    <h2>Faktura przesłana do KSeF ✅</h2>
    <p>Witaj ${data.userName},</p>
    <p>Faktura <strong>${data.invoiceNumber}</strong> została pomyślnie przesłana do systemu KSeF.</p>

    <div class="alert alert-success">
      ✅ Numer KSeF: <strong>${data.ksefNumber}</strong>
    </div>

    <p>Dokument UPO został automatycznie pobrany i przypisany do faktury.</p>

    <p>
      <a href="${data.invoiceUrl}" class="button">Zobacz fakturę</a>
    </p>

    <p style="color: #666; font-size: 14px;">Tenant: ${data.tenantName}</p>
  `
    : `
    <h2>Błąd podczas przesyłania do KSeF ❌</h2>
    <p>Witaj ${data.userName},</p>
    <p>Nie udało się przesłać faktury <strong>${data.invoiceNumber}</strong> do systemu KSeF.</p>

    <div class="alert alert-error">
      ❌ Błąd: ${data.errorMessage || 'Nieznany błąd'}
    </div>

    <p>System automatycznie spróbuje ponownie za chwilę. Jeśli problem będzie się powtarzał, sprawdź dane faktury i spróbuj ponownie ręcznie.</p>

    <p>
      <a href="${data.invoiceUrl}" class="button">Zobacz szczegóły</a>
    </p>

    <p style="color: #666; font-size: 14px;">Tenant: ${data.tenantName}</p>
  `;

  return baseTemplate(content);
}

/**
 * Manual Review Required Email
 */
export function manualReviewEmail(data: ManualReviewEmailData): string {
  const content = `
    <h2>Faktura wymaga ręcznego przeglądu</h2>
    <p>Witaj ${data.userName},</p>
    <p>Faktura od <strong>${data.companyName}</strong> (nr ${data.invoiceNumber}) została przetworzona, ale wymaga Twojego przeglądu.</p>

    <div class="alert alert-warning">
      ⚠️ Pewność rozpoznania OCR: <strong>${data.confidence}%</strong> (próg: 80%)
    </div>

    <p>Niektóre pola mogły zostać rozpoznane niepoprawnie. Sprawdź wyniki i popraw je przed zatwierdzeniem.</p>

    <p>
      <a href="${data.reviewUrl}" class="button">Przejdź do przeglądu</a>
    </p>

    <p style="color: #666; font-size: 14px;">Tenant: ${data.tenantName}</p>
  `;

  return baseTemplate(content);
}

/**
 * Monthly Digest Email
 */
export function monthlyDigestEmail(data: MonthlyDigestEmailData): string {
  const content = `
    <h2>Podsumowanie miesiąca - ${data.period}</h2>
    <p>Witaj ${data.userName},</p>
    <p>Oto podsumowanie aktywności w Deklaro za ostatni miesiąc:</p>

    <div class="stats">
      <div class="stat-item">
        <span class="stat-label">📄 Wszystkie faktury:</span>
        <span class="stat-value">${data.stats.totalInvoices}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">✅ Przetworzone:</span>
        <span class="stat-value">${data.stats.processedInvoices}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">📨 Przesłane do KSeF:</span>
        <span class="stat-value">${data.stats.ksefSubmissions}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">🏢 Nowe firmy:</span>
        <span class="stat-value">${data.stats.newCompanies}</span>
      </div>
    </div>

    <p>Dziękujemy za korzystanie z Deklaro! Jesteśmy tutaj, aby ułatwić Ci zarządzanie fakturami.</p>

    <p>
      <a href="${data.dashboardUrl}" class="button">Zobacz pełny raport</a>
    </p>

    <p style="color: #666; font-size: 14px;">Tenant: ${data.tenantName}</p>
  `;

  return baseTemplate(content);
}
