# Data Retention Policy

**Last Updated: October 23, 2025**

## 1. Introduction

This Data Retention Policy explains how long Euno retains different types of data and why. This policy applies to all users of our Service and is part of our commitment to transparency and data protection.

## 2. Retention Principles

Euno follows these key principles:

- **Purpose Limitation**: We only retain data as long as necessary for the purposes for which it was collected
- **Legal Compliance**: We comply with legal requirements for data retention
- **User Rights**: Users can request deletion of their data at any time (subject to legal exceptions)
- **Security**: All retained data is protected with appropriate security measures

## 3. Data Categories and Retention Periods

### 3.1 Active User Accounts

**Retention**: Indefinite (while account is active)

**Data Includes**:
- Account information (username, email, password hash)
- User preferences and settings
- Subscription information
- Uploaded files and data
- Database connections
- Chat conversations and AI analysis results
- Usage analytics

**Purpose**: Provide continuous service to active users

**Deletion**: User can delete account at any time (see Section 4)

### 3.2 Deleted Accounts

**Retention**: 30 days from deletion request

**Data Includes**:
- All user data (for recovery purposes during grace period)
- Backup copies

**Purpose**: Allow users to restore accidentally deleted accounts

**After 30 Days**:
- All personal data permanently deleted
- Account cannot be recovered
- Data removed from all backup systems

**Exceptions**:
- Payment records retained for 7 years (tax/legal compliance)
- Audit logs retained for 2 years (security purposes)

### 3.3 Payment and Billing Data

**Retention**: 7 years from transaction date

**Data Includes**:
- Payment transactions
- Invoices and receipts
- Subscription history
- Refund records
- Payment method details (last 4 digits, expiry)

**Purpose**: Legal and tax compliance, fraud prevention, dispute resolution

**Legal Basis**: Required by tax law and accounting regulations

**Note**: Full payment card details are never stored (processed securely by Stripe)

### 3.4 Audit Logs

**Retention**: 2 years from creation date

**Data Includes**:
- User actions (login, logout, data access, file uploads/deletes)
- IP addresses and user agents
- Timestamps
- Security events
- System access logs
- Admin actions

**Purpose**: Security monitoring, incident investigation, compliance

**Legal Basis**: Legitimate interest in maintaining security and detecting fraud

**Automatic Deletion**: Logs older than 2 years automatically purged

### 3.5 Support Communications

**Retention**: 3 years from last interaction

**Data Includes**:
- Support tickets and conversations
- Email correspondence
- Phone call records (if any)
- Issue resolution documentation

**Purpose**: Customer service quality, training, dispute resolution

**Deletion**: Can be deleted upon request (except if required for legal disputes)

### 3.6 Marketing Communications

**Retention**: Until consent is withdrawn or 2 years of inactivity

**Data Includes**:
- Email addresses for newsletters (if opted in)
- Marketing preferences
- Communication history

**Purpose**: Send requested updates and promotional materials

**User Control**: Users can unsubscribe anytime via email footer or settings

**Note**: Currently Euno does not send marketing emails beyond transactional emails

### 3.7 Uploaded Files

**Retention**: Indefinite (while account active) or until user deletes

**Data Includes**:
- CSV, Excel, JSON files uploaded by users
- Stored in AWS S3 with encryption at rest

**User Control**: Users can delete individual files anytime

**After Account Deletion**: All files deleted within 30 days

### 3.8 Database Connection Data

**Retention**: Indefinite (while connection active) or until user disconnects

**Data Includes**:
- OAuth tokens (encrypted)
- Database connection credentials (encrypted)
- Connection metadata

**Purpose**: Maintain live data integrations

**User Control**: Users can disconnect integrations anytime

**After Account Deletion**: All connection data deleted within 30 days

### 3.9 AI Analysis Results

**Retention**: Indefinite (while account active) or until user deletes conversation

**Data Includes**:
- Chat conversations
- AI-generated insights
- Visualizations
- Recommendations

**User Control**: Users can delete individual conversations or all chat history

**Third-Party Processing**: OpenAI does not retain data sent via API (zero retention policy)

**After Account Deletion**: All AI analysis results deleted within 30 days

### 3.10 Backups

**Retention**: 30 days (rolling backups)

**Data Includes**:
- Complete database backups
- File storage snapshots

**Purpose**: Disaster recovery, system restoration

**Deletion**: Backups automatically overwritten on 30-day cycle

**Note**: User deletions propagate to backups within 30 days

## 4. User-Initiated Deletion

### 4.1 Account Deletion

Users can delete their account via:
- Settings → Account → Delete Account
- Email request to support@askeuno.com

**Process**:
1. User confirms deletion (cannot be undone after 30 days)
2. 30-day grace period begins
3. User can restore account during grace period
4. After 30 days: permanent deletion of all data

**What Gets Deleted**:
- Account and profile data
- All uploaded files (from S3)
- All conversations and AI analysis
- Database connections and OAuth tokens
- Preferences and settings
- User-generated content

**What Is Retained** (legal requirements):
- Payment records (7 years)
- Audit logs (2 years)
- Support tickets related to legal disputes

### 4.2 Individual Data Deletion

Users can delete specific data without closing account:
- Individual files
- Specific conversations
- Database connections
- Support tickets (upon request)

**Timeline**: Immediate deletion from active systems, removed from backups within 30 days

## 5. Automated Data Deletion

Euno employs automated processes to ensure compliance:

**Daily Jobs**:
- Delete accounts past 30-day grace period
- Remove expired audit logs (older than 2 years)
- Clean up orphaned file references

**Monthly Jobs**:
- Review and purge inactive marketing contacts (2 years inactive)
- Archive old support tickets (older than 3 years)

**Quarterly Reviews**:
- Audit retention policy compliance
- Review and update data inventory
- Identify and delete unnecessary data

## 6. Legal Requirements

### 6.1 Compliance with Law

We may retain data longer than stated if required by law, including:
- Court orders or subpoenas
- Regulatory investigations
- Tax audits
- Fraud investigations
- Ongoing legal disputes

**User Notification**: We will notify users if their data must be retained for legal reasons (when permitted by law)

### 6.2 GDPR Compliance (EU Users)

Under GDPR, users have the right to:
- Request deletion of personal data
- Request data portability (export)
- Object to data processing
- Restrict processing in certain cases

**Exceptions**: We may retain data despite deletion request if:
- Required by law
- Necessary for legal claims
- Required for public interest

**Contact**: support@askeuno.com

### 6.3 CCPA Compliance (California Users)

California residents can request:
- Deletion of personal information
- Information about data collected
- Opt-out of data sale (note: we do not sell data)

**Timeline**: We respond to requests within 45 days

## 7. Third-Party Data Retention

### 7.1 OpenAI

**Retention**: Zero data retention via API
**Policy**: Data sent for AI analysis is not stored by OpenAI
**Reference**: https://openai.com/privacy

### 7.2 Stripe

**Retention**: As required by payment processing regulations
**User Control**: Limited (needed for payment security and fraud prevention)
**Policy**: https://stripe.com/privacy

### 7.3 AWS S3

**Retention**: Follows Euno's deletion schedule
**Control**: Euno manages all deletion
**Encryption**: Data encrypted at rest

### 7.4 Neon PostgreSQL

**Retention**: Follows Euno's deletion schedule
**Backups**: Managed by Neon with encryption
**Policy**: https://neon.tech/privacy

### 7.5 SendGrid

**Retention**: Email metadata retained for 30 days
**User Control**: Cannot delete sent transactional emails
**Policy**: https://sendgrid.com/policies/privacy

## 8. Data Breach and Incident Retention

**Retention**: 5 years from incident date

**Data Includes**:
- Breach investigation records
- Remediation documentation
- Notification records
- Post-incident analysis

**Purpose**: Regulatory compliance, future prevention, audit requirements

## 9. Changes to This Policy

### 9.1 Policy Updates

We may update this policy to:
- Comply with new regulations
- Reflect changes in data practices
- Improve user privacy protection

**Notification**:
- Email to all users (30 days advance notice)
- Update "Last Updated" date
- In-app notification

**User Rights**: If you disagree with changes, you may delete your account before changes take effect

### 9.2 Shortening Retention Periods

If we shorten retention periods:
- Changes apply to all data immediately
- Older data deleted according to new schedule
- No user action required

### 9.3 Extending Retention Periods

If we extend retention periods:
- Users notified 30 days in advance
- Users can delete account before change
- Users can request deletion of specific data

## 10. User Rights and Control

### 10.1 Access Your Data

Request a copy of all data we hold:
- Email support@askeuno.com
- Subject: "Data Access Request"
- Response within 30 days
- Delivered in machine-readable format (JSON/CSV)

### 10.2 Delete Your Data

Request deletion of your account or specific data:
- Via Settings → Account → Delete Account, or
- Email support@askeuno.com
- Subject: "Data Deletion Request"
- Processed within 30 days

### 10.3 Correct Your Data

Update inaccurate or incomplete data:
- Via Settings → Profile
- Or email support@askeuno.com
- Immediate updates

### 10.4 Export Your Data

Download all your data:
- Via Settings → Data Export
- Includes: conversations, files, data sources, settings
- Delivered in ZIP file

## 11. Contact Information

For questions about data retention:

**Email**: support@askeuno.com  
**Subject Line**: "Data Retention Inquiry"

**Data Protection Officer**: support@askeuno.com

## 12. Additional Resources

Related policies:
- [Privacy Policy](/privacy) - How we handle your data
- [Terms of Service](/terms) - Service agreement
- [Data Processing Agreement](/dpa) - For business customers
- [Cookie Policy](/cookie-policy) - Cookie usage

---

## Quick Reference

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Active accounts | Indefinite | User-initiated |
| Deleted accounts | 30 days grace period | Auto-deleted after grace period |
| Payment records | 7 years | Automatic |
| Audit logs | 2 years | Automatic |
| Support tickets | 3 years | Upon request or automatic |
| Uploaded files | Indefinite (user control) | User-initiated |
| Backups | 30 days (rolling) | Automatic overwrite |

---

© 2025 Euno. All rights reserved.
