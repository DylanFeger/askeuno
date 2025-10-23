import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileCheck } from 'lucide-react';

export default function DataProcessingAgreement() {
  useEffect(() => {
    document.title = 'Data Processing Agreement - Euno';
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Alert className="mb-6 bg-green-50 border-green-200">
            <FileCheck className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              For Enterprise customers requiring a signed DPA, please contact <a href="mailto:askeunoanalytics@gmail.com" className="underline">askeunoanalytics@gmail.com</a> to request a bilateral agreement.
            </AlertDescription>
          </Alert>

          <Card className="p-8">
            <div className="prose prose-gray max-w-none">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Processing Agreement (DPA)</h1>
              <p className="text-gray-600 mb-8">Effective Date: October 23, 2025</p>

              <p>This Data Processing Agreement ("DPA") forms part of the agreement between Euno ("Processor") and the customer ("Controller") for the provision of data analytics services ("Services").</p>

              <h2>1. Definitions</h2>
              <ul>
                <li><strong>Personal Data</strong>: Any information relating to an identified or identifiable natural person.</li>
                <li><strong>Processing</strong>: Any operation performed on Personal Data, including collection, storage, analysis, and deletion.</li>
                <li><strong>Sub-processor</strong>: Any third party engaged by Euno to process Personal Data.</li>
                <li><strong>Data Subject</strong>: The individual to whom Personal Data relates.</li>
                <li><strong>GDPR</strong>: EU General Data Protection Regulation (EU) 2016/679.</li>
              </ul>

              <h2>2. Scope and Roles</h2>
              <h3>2.1 Processor Role</h3>
              <p>Euno acts as a Processor of Personal Data on behalf of the Controller for the purposes of providing the Services.</p>

              <h3>2.2 Controller Responsibilities</h3>
              <p>The Controller determines the purposes and means of processing Personal Data and ensures compliance with applicable data protection laws.</p>

              <h2>3. Security Measures</h2>
              <p>Euno implements appropriate technical and organizational measures to ensure a level of security appropriate to the risk:</p>

              <h3>3.1 Encryption</h3>
              <ul>
                <li>Data encrypted at rest using AES-256</li>
                <li>Data encrypted in transit using TLS 1.2 or higher</li>
                <li>Database connections encrypted</li>
                <li>OAuth tokens encrypted</li>
              </ul>

              <h3>3.2 Access Controls</h3>
              <ul>
                <li>Role-based access control (RBAC)</li>
                <li>Multi-factor authentication available</li>
                <li>Secure password hashing (bcrypt with 12 rounds)</li>
                <li>Session management with secure tokens</li>
                <li>Principle of least privilege</li>
              </ul>

              <h2>4. Sub-processors</h2>
              <h3>4.1 Authorized Sub-processors</h3>
              <p>Euno engages the following sub-processors:</p>

              <table className="min-w-full divide-y divide-gray-200 my-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub-processor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm">OpenAI</td>
                    <td className="px-4 py-3 text-sm">AI Analysis</td>
                    <td className="px-4 py-3 text-sm">United States</td>
                    <td className="px-4 py-3 text-sm">Generate data insights and analysis</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">AWS S3</td>
                    <td className="px-4 py-3 text-sm">Cloud Storage</td>
                    <td className="px-4 py-3 text-sm">United States</td>
                    <td className="px-4 py-3 text-sm">Secure file storage</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">Neon Tech</td>
                    <td className="px-4 py-3 text-sm">Database</td>
                    <td className="px-4 py-3 text-sm">United States</td>
                    <td className="px-4 py-3 text-sm">PostgreSQL database hosting</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">Stripe</td>
                    <td className="px-4 py-3 text-sm">Payments</td>
                    <td className="px-4 py-3 text-sm">United States</td>
                    <td className="px-4 py-3 text-sm">Payment processing</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">SendGrid</td>
                    <td className="px-4 py-3 text-sm">Email</td>
                    <td className="px-4 py-3 text-sm">United States</td>
                    <td className="px-4 py-3 text-sm">Transactional email delivery</td>
                  </tr>
                </tbody>
              </table>

              <h2>5. Data Breach Notification</h2>
              <h3>5.1 Notification Obligation</h3>
              <p>Euno shall notify Controller without undue delay, and in any event within 72 hours, of becoming aware of a Personal Data breach.</p>

              <h3>5.2 Breach Information</h3>
              <p>Notification shall include:</p>
              <ul>
                <li>Nature of the breach</li>
                <li>Categories and approximate number of Data Subjects affected</li>
                <li>Categories and approximate number of Personal Data records affected</li>
                <li>Contact point for more information</li>
                <li>Likely consequences of the breach</li>
                <li>Measures taken or proposed to address the breach</li>
              </ul>

              <h2>6. Data Subject Rights</h2>
              <p>Euno shall assist the Controller in responding to Data Subject requests:</p>
              <ul>
                <li>Right of access</li>
                <li>Right to rectification</li>
                <li>Right to erasure ("right to be forgotten")</li>
                <li>Right to data portability</li>
                <li>Right to restriction of processing</li>
                <li>Right to object</li>
              </ul>

              <h2>7. Contact Information</h2>
              <p><strong>Data Protection Officer</strong><br />
              Email: <a href="mailto:askeunoanalytics@gmail.com">askeunoanalytics@gmail.com</a><br />
              Phone: 727-222-2519</p>

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