import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';

export default function DataRetentionPolicy() {
  useEffect(() => {
    document.title = 'Data Retention Policy - Euno';
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <div className="prose prose-gray max-w-none">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Retention Policy</h1>
              <p className="text-gray-600 mb-8">Last Updated: October 23, 2025</p>

              <h2>1. Introduction</h2>
              <p>This Data Retention Policy explains how long Euno retains different types of data and why. This policy applies to all users of our Service and is part of our commitment to transparency and data protection.</p>

              <h2>2. Retention Principles</h2>
              <p>Euno follows these key principles:</p>
              <ul>
                <li><strong>Purpose Limitation</strong>: We only retain data as long as necessary for the purposes for which it was collected</li>
                <li><strong>Legal Compliance</strong>: We comply with legal requirements for data retention</li>
                <li><strong>User Rights</strong>: Users can request deletion of their data at any time (subject to legal exceptions)</li>
                <li><strong>Security</strong>: All retained data is protected with appropriate security measures</li>
              </ul>

              <h2>3. Data Categories and Retention Periods</h2>

              <h3>3.1 Active User Accounts</h3>
              <p><strong>Retention</strong>: Indefinite (while account is active)</p>
              <p><strong>Data Includes</strong>:</p>
              <ul>
                <li>Account information (username, email, password hash)</li>
                <li>User preferences and settings</li>
                <li>Subscription information</li>
                <li>Uploaded files and data</li>
                <li>Database connections</li>
                <li>Chat conversations and AI analysis results</li>
                <li>Usage analytics</li>
              </ul>

              <h3>3.2 Deleted Accounts</h3>
              <p><strong>Retention</strong>: 30 days from deletion request</p>
              <p><strong>Purpose</strong>: Allow users to restore accidentally deleted accounts</p>
              <p><strong>After 30 Days</strong>:</p>
              <ul>
                <li>All personal data permanently deleted</li>
                <li>Account cannot be recovered</li>
                <li>Data removed from all backup systems</li>
              </ul>
              <p><strong>Exceptions</strong>:</p>
              <ul>
                <li>Payment records retained for 7 years (tax/legal compliance)</li>
                <li>Audit logs retained for 2 years (security purposes)</li>
              </ul>

              <h3>3.3 Payment and Billing Data</h3>
              <p><strong>Retention</strong>: 7 years from transaction date</p>
              <p><strong>Legal Basis</strong>: Required by tax law and accounting regulations</p>
              <p><strong>Note</strong>: Full payment card details are never stored (processed securely by Stripe)</p>

              <h3>3.4 Audit Logs</h3>
              <p><strong>Retention</strong>: 2 years from creation date</p>
              <p><strong>Data Includes</strong>:</p>
              <ul>
                <li>User actions (login, logout, data access, file uploads/deletes)</li>
                <li>IP addresses and user agents</li>
                <li>Timestamps</li>
                <li>Security events</li>
                <li>System access logs</li>
                <li>Admin actions</li>
              </ul>
              <p><strong>Automatic Deletion</strong>: Logs older than 2 years automatically purged</p>

              <h3>3.5 Support Communications</h3>
              <p><strong>Retention</strong>: 3 years from last interaction</p>

              <h3>3.6 Uploaded Files</h3>
              <p><strong>Retention</strong>: Indefinite (while account active) or until user deletes</p>
              <p><strong>User Control</strong>: Users can delete individual files anytime</p>
              <p><strong>After Account Deletion</strong>: All files deleted within 30 days</p>

              <h3>3.7 Backups</h3>
              <p><strong>Retention</strong>: 30 days (rolling backups)</p>
              <p><strong>Purpose</strong>: Disaster recovery, system restoration</p>
              <p><strong>Note</strong>: User deletions propagate to backups within 30 days</p>

              <h2>4. User-Initiated Deletion</h2>

              <h3>4.1 Account Deletion</h3>
              <p>Users can delete their account via:</p>
              <ul>
                <li>Settings → Account → Delete Account</li>
                <li>Email request to <a href="mailto:support@askeuno.com">support@askeuno.com</a></li>
              </ul>

              <p><strong>Process</strong>:</p>
              <ol>
                <li>User confirms deletion (cannot be undone after 30 days)</li>
                <li>30-day grace period begins</li>
                <li>User can restore account during grace period</li>
                <li>After 30 days: permanent deletion of all data</li>
              </ol>

              <p><strong>What Gets Deleted</strong>:</p>
              <ul>
                <li>Account and profile data</li>
                <li>All uploaded files (from S3)</li>
                <li>All conversations and AI analysis</li>
                <li>Database connections and OAuth tokens</li>
                <li>Preferences and settings</li>
                <li>User-generated content</li>
              </ul>

              <p><strong>What Is Retained</strong> (legal requirements):</p>
              <ul>
                <li>Payment records (7 years)</li>
                <li>Audit logs (2 years)</li>
                <li>Support tickets related to legal disputes</li>
              </ul>

              <h2>5. User Rights and Control</h2>

              <h3>5.1 Access Your Data</h3>
              <p>Request a copy of all data we hold:</p>
              <ul>
                <li>Email <a href="mailto:support@askeuno.com">support@askeuno.com</a></li>
                <li>Subject: "Data Access Request"</li>
                <li>Response within 30 days</li>
                <li>Delivered in machine-readable format (JSON/CSV)</li>
              </ul>

              <h3>5.2 Delete Your Data</h3>
              <p>Request deletion of your account or specific data:</p>
              <ul>
                <li>Via Settings → Account → Delete Account, or</li>
                <li>Email <a href="mailto:support@askeuno.com">support@askeuno.com</a></li>
                <li>Subject: "Data Deletion Request"</li>
                <li>Processed within 30 days</li>
              </ul>

              <h3>5.3 Export Your Data</h3>
              <p>Download all your data:</p>
              <ul>
                <li>Via Settings → Data Export</li>
                <li>Includes: conversations, files, data sources, settings</li>
                <li>Delivered in ZIP file</li>
              </ul>

              <h2>6. Contact Information</h2>
              <p>For questions about data retention:</p>
              <p>
                <strong>Email</strong>: <a href="mailto:support@askeuno.com">support@askeuno.com</a><br />
                <strong>Subject Line</strong>: "Data Retention Inquiry"
              </p>

              <h2>Quick Reference</h2>
              <table className="min-w-full divide-y divide-gray-200 my-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retention Period</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deletion Method</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm">Active accounts</td>
                    <td className="px-4 py-3 text-sm">Indefinite</td>
                    <td className="px-4 py-3 text-sm">User-initiated</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">Deleted accounts</td>
                    <td className="px-4 py-3 text-sm">30 days grace period</td>
                    <td className="px-4 py-3 text-sm">Auto-deleted after grace period</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">Payment records</td>
                    <td className="px-4 py-3 text-sm">7 years</td>
                    <td className="px-4 py-3 text-sm">Automatic</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">Audit logs</td>
                    <td className="px-4 py-3 text-sm">2 years</td>
                    <td className="px-4 py-3 text-sm">Automatic</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">Support tickets</td>
                    <td className="px-4 py-3 text-sm">3 years</td>
                    <td className="px-4 py-3 text-sm">Upon request or automatic</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">Uploaded files</td>
                    <td className="px-4 py-3 text-sm">Indefinite (user control)</td>
                    <td className="px-4 py-3 text-sm">User-initiated</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">Backups</td>
                    <td className="px-4 py-3 text-sm">30 days (rolling)</td>
                    <td className="px-4 py-3 text-sm">Automatic overwrite</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-8 pt-8 border-t border-gray-200">
                <p className="text-gray-600 text-sm">© 2025 Euno. All rights reserved.</p>
              </div>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}