# Data Processing Agreement (DPA)

**Effective Date: October 23, 2025**

This Data Processing Agreement ("DPA") forms part of the agreement between Euno ("Processor") and the customer ("Controller") for the provision of data analytics services ("Services").

## 1. Definitions

**Personal Data**: Any information relating to an identified or identifiable natural person.

**Processing**: Any operation performed on Personal Data, including collection, storage, analysis, and deletion.

**Sub-processor**: Any third party engaged by Euno to process Personal Data.

**Data Subject**: The individual to whom Personal Data relates.

**GDPR**: EU General Data Protection Regulation (EU) 2016/679.

## 2. Scope and Roles

### 2.1 Processor Role
Euno acts as a Processor of Personal Data on behalf of the Controller for the purposes of providing the Services.

### 2.2 Controller Responsibilities
The Controller determines the purposes and means of processing Personal Data and ensures compliance with applicable data protection laws.

### 2.3 Data Processing Scope
Euno processes Personal Data only as necessary to provide the Services and in accordance with Controller's documented instructions.

## 3. Processing Instructions

### 3.1 Lawful Instructions
Euno shall process Personal Data only on documented instructions from the Controller, including:
- Through use of the Service interface
- Via API calls
- Through support requests
- As specified in our Terms of Service

### 3.2 Unlawful Instructions
If Euno believes an instruction violates GDPR or other applicable law, Euno shall immediately inform the Controller.

## 4. Data Types and Processing Activities

### 4.1 Categories of Data Subjects
- Controller's employees and authorized users
- Controller's customers (if their data is uploaded)
- Controller's business contacts

### 4.2 Types of Personal Data
- Contact information (names, email addresses)
- Business data (sales records, customer information, financial data)
- Usage data (login times, IP addresses, queries submitted)
- Account credentials (encrypted)

### 4.3 Processing Activities
- Data storage and retrieval
- AI-powered data analysis
- Data visualization
- Secure file storage
- Database connectivity
- Customer support

### 4.4 Processing Duration
Data is processed for the duration of the Service agreement and retained according to our [Data Retention Policy](/retention).

## 5. Security Measures

Euno implements appropriate technical and organizational measures to ensure a level of security appropriate to the risk:

### 5.1 Encryption
- Data encrypted at rest using AES-256
- Data encrypted in transit using TLS 1.2 or higher
- Database connections encrypted
- OAuth tokens encrypted

### 5.2 Access Controls
- Role-based access control (RBAC)
- Multi-factor authentication available
- Secure password hashing (bcrypt with 12 rounds)
- Session management with secure tokens
- Principle of least privilege

### 5.3 Infrastructure Security
- Hosted on secure cloud infrastructure (AWS, Neon)
- Regular security updates and patches
- Intrusion detection systems
- Automated vulnerability scanning
- Security monitoring 24/7

### 5.4 Data Isolation
- Logical separation of customer data
- Unique S3 folders per customer
- Row-level security in database
- Access logging and audit trails

### 5.5 Personnel Security
- Background checks for employees with data access
- Confidentiality agreements
- Security training
- Access revocation procedures

## 6. Sub-processors

### 6.1 Authorized Sub-processors
Euno engages the following sub-processors:

| Sub-processor | Service | Location | Purpose |
|--------------|---------|----------|---------|
| OpenAI | AI Analysis | United States | Generate data insights and analysis |
| AWS S3 | Cloud Storage | United States | Secure file storage |
| Neon Tech | Database | United States | PostgreSQL database hosting |
| Stripe | Payments | United States | Payment processing |
| SendGrid | Email | United States | Transactional email delivery |

### 6.2 Sub-processor Obligations
All sub-processors are bound by written agreements requiring:
- GDPR compliance
- Appropriate security measures
- Confidentiality obligations
- Data protection commitments

### 6.3 Changes to Sub-processors
- Euno will notify Controller of any intended changes to sub-processors
- Controller has 30 days to object to new sub-processors
- If objection cannot be resolved, Controller may terminate the agreement

### 6.4 Sub-processor List Updates
Current sub-processor list available at: https://askeuno.com/sub-processors

## 7. Data Subject Rights

### 7.1 Assistance with Requests
Euno shall assist the Controller in responding to Data Subject requests:
- Right of access
- Right to rectification
- Right to erasure ("right to be forgotten")
- Right to data portability
- Right to restriction of processing
- Right to object

### 7.2 Technical Assistance
Euno provides technical capabilities for Controller to:
- Export data in machine-readable format (JSON/CSV)
- Delete specific data sets
- Correct inaccurate data
- Restrict processing

### 7.3 Response Time
Euno will provide assistance within 48 hours of request from Controller.

## 8. Data Breach Notification

### 8.1 Notification Obligation
Euno shall notify Controller without undue delay, and in any event within 72 hours, of becoming aware of a Personal Data breach.

### 8.2 Breach Information
Notification shall include:
- Nature of the breach
- Categories and approximate number of Data Subjects affected
- Categories and approximate number of Personal Data records affected
- Contact point for more information
- Likely consequences of the breach
- Measures taken or proposed to address the breach

### 8.3 Incident Response
Euno maintains an incident response plan and will:
- Investigate the breach promptly
- Take measures to mitigate harm
- Cooperate with Controller's investigation
- Assist with regulatory notifications if required

## 9. Data Transfers

### 9.1 International Transfers
Personal Data may be transferred outside the European Economic Area (EEA) to the United States.

### 9.2 Transfer Safeguards
For transfers from EEA to non-EEA countries, Euno implements:
- Standard Contractual Clauses (SCCs) approved by EU Commission
- Technical and organizational security measures
- Sub-processor contractual obligations

### 9.3 Transfer Documentation
Upon request, Euno will provide copies of:
- Standard Contractual Clauses
- Sub-processor agreements
- Transfer impact assessments

## 10. Audits and Inspections

### 10.1 Audit Rights
Controller has the right to audit Euno's compliance with this DPA through:
- Self-assessment questionnaires
- Third-party audit reports (e.g., SOC 2, ISO 27001)
- On-site inspections (with reasonable notice)

### 10.2 Audit Frequency
- Regular audits: Annually
- Cause audits: As needed following a breach or complaint
- Notice required: 30 days for on-site inspections

### 10.3 Audit Costs
- Self-assessments: No charge
- Third-party reports: Provided upon request
- On-site inspections: Controller bears reasonable costs

### 10.4 Audit Cooperation
Euno will:
- Provide requested documentation
- Grant access to relevant systems
- Make personnel available for interviews
- Implement remediation actions if deficiencies found

## 11. Data Deletion and Return

### 11.1 Upon Termination
Upon termination of Services, Euno shall:
- Return all Personal Data to Controller in machine-readable format, OR
- Delete all Personal Data, at Controller's choice

### 11.2 Deletion Timeline
- Controller has 30 days to export data after termination
- After 30 days, all data is permanently deleted
- Deletion confirmation provided upon request

### 11.3 Retention Exceptions
Euno may retain data as required by law:
- Payment records: 7 years (tax compliance)
- Audit logs: 2 years (security)
- Backup data: 30 days (disaster recovery)

### 11.4 Backup Deletion
Data in backups shall be deleted in accordance with Euno's backup retention schedule (maximum 30 days).

## 12. Confidentiality

### 12.1 Personnel Obligations
Euno ensures that all personnel authorized to process Personal Data:
- Are subject to confidentiality agreements
- Receive appropriate data protection training
- Process data only as instructed

### 12.2 Confidential Information
Personal Data shall be treated as confidential and not disclosed except:
- As required to provide Services
- As required by law
- With Controller's prior written consent

## 13. Liability and Indemnity

### 13.1 Processor Liability
Euno is liable for damage caused by processing where:
- Euno has not complied with GDPR obligations
- Euno acted outside or contrary to lawful instructions

### 13.2 Limitation
Liability is subject to limitations in the main Service Agreement and applicable law.

### 13.3 Indemnification
Each party shall indemnify the other for losses arising from:
- Breach of this DPA
- Violation of data protection laws
- Negligence in handling Personal Data

## 14. Cooperation with Authorities

### 14.1 Regulatory Cooperation
Euno will cooperate with data protection authorities as required by law.

### 14.2 Data Protection Impact Assessments
Euno will provide reasonable assistance with:
- Data Protection Impact Assessments (DPIAs)
- Prior consultations with supervisory authorities

### 14.3 Information Provision
Upon request, Euno will provide information necessary to demonstrate compliance with this DPA.

## 15. Term and Termination

### 15.1 Duration
This DPA remains in effect for the duration of the Service Agreement.

### 15.2 Survival
Provisions regarding data deletion, confidentiality, and liability survive termination.

### 15.3 Termination Rights
Either party may terminate if the other:
- Materially breaches this DPA
- Fails to cure breach within 30 days of notice

## 16. Amendments

### 16.1 Changes to DPA
Changes to this DPA must be:
- In writing
- Signed by both parties
- Consistent with GDPR requirements

### 16.2 Changes Due to Law
Euno may update this DPA to comply with changes in data protection laws with 30 days notice.

## 17. Governing Law and Jurisdiction

### 17.1 Governing Law
This DPA is governed by the same law as the main Service Agreement.

### 17.2 Conflict
In case of conflict between this DPA and the main Service Agreement, this DPA prevails on data protection matters.

### 17.3 Standard Contractual Clauses
Where applicable, EU Standard Contractual Clauses form part of this DPA and take precedence in case of conflict.

## 18. Contact Information

For DPA-related inquiries:

**Data Protection Officer**  
Email: askeunoanalytics@gmail.com  
Phone: 727-222-2519

**For Regulatory Matters**  
Include reference: "DPA - Data Protection Inquiry"

## 19. Execution

This DPA is effective as of the date Controller accepts the Terms of Service or signs a separate service agreement.

**Acknowledgment**: By using Euno Services, Controller acknowledges and agrees to the terms of this Data Processing Agreement.

---

**For Enterprise customers requiring a signed DPA**, please contact askeunoanalytics@gmail.com to request a bilateral agreement.

---

© 2025 Euno. All rights reserved.
