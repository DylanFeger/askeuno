import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';

export default function TermsOfService() {
  useEffect(() => {
    document.title = 'Terms of Service - Euno';
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <div className="prose prose-gray max-w-none">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
              <p className="text-gray-600 mb-8">Last Updated: October 23, 2025</p>

              <h2>1. Agreement to Terms</h2>
              <p>By accessing or using Euno ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.</p>

              <h2>2. Description of Service</h2>
              <p>Euno is a secure data analytics platform that enables small businesses to upload, store, and analyze their business data using AI-powered insights. The Service provides:</p>
              <ul>
                <li>Secure file upload and storage</li>
                <li>Database connection integrations</li>
                <li>AI-powered data analysis via conversational interface</li>
                <li>Data visualization tools (tier-dependent)</li>
                <li>Team collaboration features (Enterprise tier)</li>
              </ul>

              <h2>3. User Accounts</h2>
              <h3>3.1 Registration</h3>
              <p>You must provide accurate, current, and complete information during registration. You are responsible for safeguarding your account password and for any activities or actions under your account.</p>

              <h3>3.2 Account Security</h3>
              <p>You must immediately notify us at <a href="mailto:support@askeuno.com">support@askeuno.com</a> of any unauthorized use of your account or any other breach of security.</p>

              <h2>4. Subscription Plans and Payments</h2>
              <h3>4.1 Subscription Tiers</h3>
              <p>Euno offers three subscription tiers:</p>
              <ul>
                <li><strong>Starter</strong>: Free tier with limited features</li>
                <li><strong>Professional</strong>: $99/month or $1,009/year (15% discount)</li>
                <li><strong>Enterprise</strong>: $249/month or $2,540/year (15% discount)</li>
              </ul>

              <h3>4.2 Billing</h3>
              <ul>
                <li>Subscriptions are billed in advance on a monthly or annual basis</li>
                <li>All fees are in US Dollars and exclude applicable taxes</li>
                <li>Payment is processed securely through Stripe</li>
                <li>Annual subscriptions offer a 15% discount compared to monthly billing</li>
              </ul>

              <h3>4.3 Automatic Renewal</h3>
              <p>Your subscription will automatically renew at the end of each billing period unless you cancel before the renewal date.</p>

              <h3>4.4 Cancellation and Refunds</h3>
              <p>Please refer to our <a href="/refund-policy">Refund Policy</a> for details on cancellations and refunds.</p>

              <h2>5. Data Ownership and Usage</h2>
              <h3>5.1 Your Data</h3>
              <p>You retain all rights to the data you upload to Euno. We do not claim ownership of your business data, files, or content.</p>

              <h3>5.2 License to Operate</h3>
              <p>You grant Euno a limited license to use, process, and store your data solely for the purpose of providing the Service to you.</p>

              <h3>5.3 Third-Party Processing</h3>
              <p>Your data may be processed by third-party services as necessary to provide functionality:</p>
              <ul>
                <li><strong>OpenAI</strong>: For AI-powered data analysis</li>
                <li><strong>AWS S3</strong>: For secure file storage</li>
                <li><strong>Neon PostgreSQL</strong>: For structured data storage</li>
                <li><strong>Stripe</strong>: For payment processing</li>
              </ul>
              <p>See our <a href="/privacy">Privacy Policy</a> for details.</p>

              <h2>6. Acceptable Use Policy</h2>
              <p>You agree NOT to use the Service to:</p>
              <ul>
                <li>Upload illegal, harmful, threatening, abusive, or defamatory content</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights of others</li>
                <li>Attempt to gain unauthorized access to the Service or related systems</li>
                <li>Transmit viruses, malware, or other malicious code</li>
                <li>Use the Service to spam, phish, or engage in fraudulent activities</li>
                <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
                <li>Resell, lease, or provide the Service to third parties without authorization</li>
              </ul>

              <h3>6.1 Consequences of Violation</h3>
              <p>We reserve the right to suspend or terminate accounts that violate this policy.</p>

              <h2>7. Limitation of Liability</h2>
              <h3>7.1 Service "As Is"</h3>
              <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.</p>

              <h3>7.2 Liability Cap</h3>
              <p>IN NO EVENT SHALL EUNO BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.</p>
              <p>OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRIOR TO THE EVENT GIVING RISE TO THE LIABILITY.</p>

              <h2>8. Account Termination</h2>
              <h3>8.1 By You</h3>
              <p>You may terminate your account at any time through your account settings. See our <a href="/refund-policy">Refund Policy</a> for applicable refunds.</p>

              <h3>8.2 By Us</h3>
              <p>We may terminate or suspend your account if you violate these Terms, engage in fraudulent activity, or for other legitimate business reasons. We will provide notice when reasonably possible.</p>

              <h3>8.3 Effect of Termination</h3>
              <p>Upon termination:</p>
              <ul>
                <li>Your access to the Service will cease immediately</li>
                <li>You may export your data within 30 days</li>
                <li>After 30 days, your data will be permanently deleted</li>
                <li>Paid subscriptions may be eligible for pro-rated refunds (see Refund Policy)</li>
              </ul>

              <h2>9. Privacy</h2>
              <p>Your privacy is important to us. Please review our <a href="/privacy">Privacy Policy</a> to understand how we collect, use, and protect your information.</p>

              <h2>10. Changes to Terms</h2>
              <p>We reserve the right to modify these Terms at any time. We will notify users of material changes via email at least 30 days before they take effect. Your continued use of the Service after changes take effect constitutes acceptance of the new Terms.</p>

              <h2>11. Contact Information</h2>
              <p>For questions about these Terms, please contact us:</p>
              <p>
                <strong>Email</strong>: <a href="mailto:support@askeuno.com">support@askeuno.com</a>
              </p>

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