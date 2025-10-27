# 📖 Deklaro User Guide

Complete guide for using Deklaro invoice automation platform.

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Managing Invoices](#managing-invoices)
3. [Team Collaboration](#team-collaboration)
4. [Company Management](#company-management)
5. [KSeF Integration](#ksef-integration)
6. [Subscription & Billing](#subscription--billing)
7. [Settings & Preferences](#settings--preferences)
8. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### Creating Your Account

1. Go to [your-domain.com/signup](https://your-domain.com/signup)
2. Enter your email address and create a password
3. Click "Sign Up"
4. Check your email for verification link
5. Click the verification link to activate your account

### First Login

1. Go to [your-domain.com/login](https://your-domain.com/login)
2. Enter your email and password
3. Click "Sign In"
4. You'll be redirected to your dashboard

### Setting Up Your Organization

After your first login:

1. **Create Your Organization**
   - Enter your company name
   - Add company details (NIP, address)
   - Click "Create Organization"

2. **Complete Your Profile**
   - Go to Settings
   - Add your full name
   - Set your preferences
   - Choose language (English/Polish)

---

## Managing Invoices

### Uploading Invoices

#### Method 1: Drag & Drop

1. Go to **Invoices** → **Upload**
2. Drag invoice files (PDF, JPG, PNG) into the upload area
3. Drop the files to start upload
4. Wait for processing to complete

#### Method 2: File Browser

1. Go to **Invoices** → **Upload**
2. Click "Choose Files"
3. Select one or more invoice files
4. Click "Open" to upload

**Supported Formats:**
- PDF (.pdf)
- JPEG (.jpg, .jpeg)
- PNG (.png)

**Limits:**
- Max 10 files per upload
- Max 10MB per file

### Understanding Invoice Status

| Status | Meaning | What You Can Do |
|--------|---------|-----------------|
| **DRAFT** | Invoice created, not yet processed | Edit, Delete |
| **PROCESSING** | OCR extraction in progress | Wait for completion |
| **REVIEWED** | OCR completed, awaiting review | Review, Edit, Approve, Reject |
| **APPROVED** | Ready for submission | Submit to KSeF, Export |
| **REJECTED** | Not approved | Review reason, Re-upload |
| **SUBMITTED** | Sent to KSeF | Download UPO, View status |

### Reviewing Extracted Data

After OCR processing:

1. Go to **Invoices** → **Review**
2. Click on an invoice to open details
3. Verify extracted information:
   - Invoice number
   - Issue and due dates
   - Seller and buyer information
   - Line items
   - Amounts (net, VAT, gross)

4. **Edit if needed:**
   - Click on any field to edit
   - Make corrections
   - Click "Save Changes"

5. **Approve or Reject:**
   - Click "Approve" if data is correct
   - Click "Reject" with reason if incorrect

### Searching Invoices

**Quick Search:**
1. Use the search bar at the top
2. Enter invoice number, company name, or amount
3. Results appear as you type

**Advanced Filters:**
1. Click "Filters" button
2. Select criteria:
   - Status
   - Date range
   - Company
   - Amount range
3. Click "Apply Filters"

### Exporting Invoices

**Export Single Invoice:**
1. Open invoice details
2. Click "Export" dropdown
3. Choose format: PDF, Excel, XML
4. File downloads automatically

**Bulk Export:**
1. Select multiple invoices (checkboxes)
2. Click "Export Selected"
3. Choose format
4. Download ZIP file with all invoices

---

## Team Collaboration

### Understanding User Roles

#### Owner
- Full access to everything
- Can invite/remove team members
- Can manage billing
- Can delete organization

#### Accountant
- Upload and manage invoices
- Approve/reject invoices
- Submit to KSeF
- View reports
- Cannot manage team or billing

#### Client
- View assigned invoices only
- Cannot edit or approve
- Cannot submit to KSeF
- Read-only access

### Inviting Team Members

1. Go to **Team** → **Invite Member**
2. Enter team member's email
3. Select role (Owner, Accountant, Client)
4. Add optional personal message
5. Click "Send Invitation"

**What happens next:**
- Invitee receives email with invitation link
- Link is valid for 7 days
- They can accept with existing account or create new one

### Managing Invitations

**View Pending Invitations:**
1. Go to **Team** → **Invitations**
2. See list of sent invitations
3. Check status: Pending, Accepted, Expired

**Resend Invitation:**
1. Find invitation in list
2. Click "Resend" button
3. New email sent with fresh link

**Revoke Invitation:**
1. Find invitation in list
2. Click "Revoke" button
3. Confirm action
4. Invitation link becomes invalid

### Accepting an Invitation

**If you received an invitation:**

1. Open invitation email
2. Click "Accept Invitation" link
3. **If you have an account:**
   - Log in with your credentials
   - You'll be added to the organization
4. **If you don't have an account:**
   - Click "Sign Up"
   - Create your account
   - You'll be automatically added

### Managing Team Members

**View Team Members:**
1. Go to **Team** → **Members**
2. See all active members
3. View their roles and join dates

**Change Member Role** (Owners only):
1. Find member in list
2. Click "Edit Role"
3. Select new role
4. Click "Update"

**Remove Team Member** (Owners only):
1. Find member in list
2. Click "Remove" button
3. Confirm action
4. Member loses access immediately

---

## Company Management

### Adding a Company

1. Go to **Companies** → **Add Company**
2. Enter company details:
   - Company name
   - NIP (Polish tax ID)
   - Address, city, postal code
3. Click "Save Company"

### Validating NIP

**Automatic Validation:**
1. Enter NIP in the form
2. Click "Validate NIP" button
3. System fetches data from GUS registry
4. Company details auto-fill

**Manual Entry:**
- If validation fails, you can enter details manually
- Double-check information for accuracy

### Viewing Company Details

1. Go to **Companies**
2. Click on a company name
3. View complete information:
   - Basic details
   - Tax information
   - Associated invoices
   - Transaction history

### Editing Company Information

1. Open company details
2. Click "Edit" button
3. Modify information
4. Click "Save Changes"

### Deleting a Company

1. Open company details
2. Click "Delete Company"
3. Confirm action (irreversible!)
4. Company and associated data removed

**Note:** Cannot delete company with active invoices

---

## KSeF Integration

### What is KSeF?

KSeF (Krajowy System e-Faktur) is Poland's National e-Invoice System. All Polish businesses must submit invoices through KSeF.

### Prerequisites

Before using KSeF:
- [ ] Have valid Polish NIP
- [ ] Production KSeF certificate installed (admin task)
- [ ] Invoices approved and ready

### Submitting Invoice to KSeF

1. Go to **Invoices**
2. Find approved invoice
3. Click "Submit to KSeF"
4. Review summary
5. Click "Confirm Submission"
6. Wait for confirmation (usually < 1 minute)

**Success:**
- Status changes to "SUBMITTED"
- KSeF number assigned
- UPO (confirmation) available

**Failure:**
- Error message displayed
- Invoice returns to "APPROVED" status
- Fix issues and retry

### Checking KSeF Status

1. Open submitted invoice
2. View "KSeF Status" section
3. See:
   - KSeF number
   - Submission date
   - Acceptance date
   - Current status

### Downloading UPO

UPO (Urzędowe Poświadczenie Odbioru) is official confirmation from KSeF.

1. Open submitted invoice
2. Click "Download UPO"
3. PDF file downloads
4. Keep for your records

### KSeF Troubleshooting

**"Certificate expired"**
- Contact system administrator
- Certificate needs renewal

**"Invalid invoice data"**
- Check all required fields
- Verify NIP numbers
- Ensure amounts match

**"KSeF system unavailable"**
- Wait and try again later
- KSeF has scheduled maintenance

---

## Subscription & Billing

### Subscription Plans

#### Starter (Free)
- 50 invoices/month
- 500 MB storage
- 1 user
- Email support

#### Pro ($99/month)
- 500 invoices/month
- 5 GB storage
- 5 users
- Priority support
- Advanced analytics

#### Enterprise ($299/month)
- Unlimited invoices
- Unlimited storage
- Unlimited users
- Dedicated support
- Custom integrations

### Upgrading Your Plan

1. Go to **Settings** → **Billing**
2. Click "Upgrade Plan"
3. Select desired plan
4. Click "Continue to Payment"
5. Enter payment details
6. Click "Subscribe"

**What happens:**
- Instant upgrade
- Charged immediately
- New limits active immediately
- Can downgrade anytime

### Managing Your Subscription

**View Current Plan:**
1. Go to **Settings** → **Billing**
2. See current plan and usage
3. View renewal date

**Update Payment Method:**
1. Go to **Settings** → **Billing**
2. Click "Manage Billing"
3. Opens Stripe portal
4. Update card details

**Cancel Subscription:**
1. Go to **Settings** → **Billing**
2. Click "Manage Billing"
3. Click "Cancel Subscription"
4. Confirm cancellation
5. Access until end of billing period

### Usage & Limits

**Check Your Usage:**
1. Go to **Settings** → **Billing**
2. View usage dashboard:
   - Invoices processed this month
   - Storage used
   - Active team members

**When You Hit Limits:**
- Upload blocked until:
  - Next billing cycle
  - Or you upgrade plan

---

## Settings & Preferences

### Profile Settings

**Update Personal Information:**
1. Go to **Settings** → **Profile**
2. Update:
   - Full name
   - Email address
   - Phone number
3. Click "Save Changes"

**Change Password:**
1. Go to **Settings** → **Security**
2. Click "Change Password"
3. Enter current password
4. Enter new password (twice)
5. Click "Update Password"

### Language Preferences

**Switch Language:**
1. Go to **Settings** → **Preferences**
2. Select language:
   - English
   - Polski (Polish)
3. Interface updates immediately

**Available in Both Languages:**
- All UI elements
- Email notifications
- Invoice templates
- Error messages

### Notification Settings

**Configure Notifications:**
1. Go to **Settings** → **Notifications**
2. Toggle preferences:
   - Email notifications
   - Invoice processing complete
   - Team invitations
   - Subscription updates
   - KSeF status changes
3. Changes save automatically

### Organization Settings

**Update Organization Details** (Owners only):
1. Go to **Settings** → **Organization**
2. Update:
   - Organization name
   - Contact information
   - Tax details
3. Click "Save Changes"

---

## Tips & Best Practices

### Invoice Processing

**For Best OCR Results:**
- Upload high-quality scans (300 DPI minimum)
- Ensure documents are readable
- Avoid heavily skewed or rotated images
- Keep files under 10MB

**Batch Processing:**
- Upload multiple invoices at once
- Use consistent naming convention
- Check a few samples before bulk approval

### Data Accuracy

**Always Verify:**
- Invoice numbers
- Dates (issue and due dates)
- Company NIPs
- Amounts (especially VAT calculations)

**Common OCR Errors:**
- Date format misinterpretation
- Number confusion (0 vs O, 1 vs l)
- Decimal separator issues

### Team Collaboration

**Role Assignment:**
- Limit Owner role to 1-2 people
- Use Accountant for finance team
- Use Client for external viewers

**Communication:**
- Use invitation messages to provide context
- Set clear expectations for each role
- Review team access quarterly

### Security

**Protect Your Account:**
- Use strong, unique password
- Don't share credentials
- Log out on shared computers
- Enable notifications for security events

**Data Privacy:**
- Only invite trusted team members
- Revoke access when team members leave
- Regularly audit team member list

### KSeF Submissions

**Before Submitting:**
- Double-check all invoice data
- Verify both seller and buyer NIPs
- Ensure VAT calculations are correct
- Review line items

**After Submission:**
- Download and store UPO
- Update your accounting system
- Keep records for tax audits

### Subscription Management

**Optimize Costs:**
- Monitor monthly usage
- Upgrade only when needed
- Use Starter plan for testing
- Cancel unused subscriptions promptly

**Avoid Service Interruption:**
- Keep payment method up to date
- Set calendar reminder for renewal
- Monitor usage before month-end

---

## Getting Help

### In-App Support

**Help Center:**
- Click "?" icon in top right
- Search for answers
- Browse articles by topic

**Contact Support:**
1. Click "Support" in menu
2. Describe your issue
3. Attach screenshots if helpful
4. Click "Submit Ticket"

**Response Times:**
- Starter: 48 hours
- Pro: 24 hours
- Enterprise: 4 hours

### Common Questions

**"Why is OCR taking so long?"**
- Processing time varies by file size
- Complex invoices take longer
- Typical: 30-60 seconds per invoice

**"Can I bulk approve invoices?"**
- Currently: No, review each individually
- Coming soon: Bulk operations

**"How do I export for my accounting software?"**
- Use Excel export format
- Or use XML for direct import

**"Can I use Deklaro offline?"**
- No, requires internet connection
- Data syncs automatically when online

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + U` | Upload invoice |
| `Ctrl/Cmd + K` | Quick search |
| `Ctrl/Cmd + ,` | Open settings |
| `Esc` | Close modal/dialog |
| `↑/↓` | Navigate list |
| `Enter` | Open selected item |

---

## Glossary

**NIP** - Numer Identyfikacji Podatkowej (Polish Tax ID)

**KSeF** - Krajowy System e-Faktur (National e-Invoice System)

**UPO** - Urzędowe Poświadczenie Odbioru (Official Receipt Confirmation)

**OCR** - Optical Character Recognition (automated text extraction)

**VAT** - Value Added Tax

**GUS** - Główny Urząd Statystyczny (Central Statistical Office of Poland)

**REGON** - National Official Business Register Number

---

## What's New

### Latest Updates

**Version 1.0.0** (October 2025)
- ✨ Team collaboration features
- ✨ Multi-language support (English/Polish)
- ✨ Stripe payment integration
- ✨ Production KSeF integration
- ✨ Enhanced security features
- ✨ Comprehensive E2E tests

---

## Additional Resources

- [API Documentation](./API.md) - For developers
- [Deployment Guide](./DEPLOYMENT.md) - For system administrators
- [Admin Setup Guide](./ADMIN_SETUP.md) - For initial configuration
- [Implementation Report](./IMPLEMENTATION_COMPLETE.md) - Technical details

---

## Feedback

We value your feedback! Help us improve Deklaro:

- **Report Bugs**: [GitHub Issues](https://github.com/your-org/deklaro-light/issues)
- **Suggest Features**: Click "Feedback" in app
- **Contact Us**: support@yourdomain.com

---

**Last Updated**: 2025-10-27
**Version**: 1.0.0
