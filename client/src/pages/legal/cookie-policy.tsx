import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';

export default function CookiePolicy() {
  useEffect(() => {
    document.title = 'Cookie Policy - Euno';
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <div className="prose prose-gray max-w-none">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Cookie Policy</h1>
              <p className="text-gray-600 mb-8">Last Updated: October 23, 2025</p>

              <h2>1. Introduction</h2>
              <p>This Cookie Policy explains how Euno ("we," "our," or "us") uses cookies and similar technologies when you visit our website at askeuno.com ("Site") or use our Service.</p>

              <h2>2. What Are Cookies?</h2>
              <p>Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners.</p>

              <h3>2.1 Types of Cookies</h3>
              
              <p><strong>Session Cookies:</strong></p>
              <ul>
                <li>Temporary cookies that expire when you close your browser</li>
                <li>Essential for website functionality</li>
              </ul>

              <p><strong>Persistent Cookies:</strong></p>
              <ul>
                <li>Remain on your device for a set period or until you delete them</li>
                <li>Remember your preferences for future visits</li>
              </ul>

              <p><strong>First-Party Cookies:</strong></p>
              <ul>
                <li>Set by Euno directly</li>
                <li>Used for essential site functionality and preferences</li>
              </ul>

              <p><strong>Third-Party Cookies:</strong></p>
              <ul>
                <li>Set by external services we use (analytics, payment processing)</li>
                <li>Subject to the privacy policies of those third parties</li>
              </ul>

              <h2>3. Cookies We Use</h2>
              
              <h3>3.1 Strictly Necessary Cookies</h3>
              <p>These cookies are essential for the Site to function and cannot be disabled.</p>

              <table className="min-w-full divide-y divide-gray-200 my-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cookie Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm">connect.sid</td>
                    <td className="px-4 py-3 text-sm">Session management</td>
                    <td className="px-4 py-3 text-sm">Session</td>
                    <td className="px-4 py-3 text-sm">First-party</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">_csrf</td>
                    <td className="px-4 py-3 text-sm">Security (CSRF protection)</td>
                    <td className="px-4 py-3 text-sm">Session</td>
                    <td className="px-4 py-3 text-sm">First-party</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">cookie_consent</td>
                    <td className="px-4 py-3 text-sm">Stores your cookie preferences</td>
                    <td className="px-4 py-3 text-sm">1 year</td>
                    <td className="px-4 py-3 text-sm">First-party</td>
                  </tr>
                </tbody>
              </table>

              <p><strong>Purpose</strong>: Authentication, security, maintaining your session while you use Euno.</p>
              <p><strong>Legal Basis</strong>: Legitimate interest (necessary for service provision).</p>

              <h3>3.2 Functionality Cookies</h3>
              <p>These cookies enable enhanced functionality and personalization.</p>

              <table className="min-w-full divide-y divide-gray-200 my-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cookie Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm">theme_preference</td>
                    <td className="px-4 py-3 text-sm">Remembers dark/light mode choice</td>
                    <td className="px-4 py-3 text-sm">1 year</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">extended_responses</td>
                    <td className="px-4 py-3 text-sm">Saves AI response length preference</td>
                    <td className="px-4 py-3 text-sm">1 year</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">last_data_source</td>
                    <td className="px-4 py-3 text-sm">Remembers last used data source</td>
                    <td className="px-4 py-3 text-sm">30 days</td>
                  </tr>
                </tbody>
              </table>

              <p><strong>Legal Basis</strong>: Consent (can be disabled without affecting core functionality).</p>

              <h3>3.3 Payment Cookies</h3>
              <p>When processing payments through Stripe:</p>

              <table className="min-w-full divide-y divide-gray-200 my-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cookie Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm">__stripe_mid</td>
                    <td className="px-4 py-3 text-sm">Fraud detection</td>
                    <td className="px-4 py-3 text-sm">1 year</td>
                    <td className="px-4 py-3 text-sm">Third-party (Stripe)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">__stripe_sid</td>
                    <td className="px-4 py-3 text-sm">Payment session</td>
                    <td className="px-4 py-3 text-sm">30 minutes</td>
                    <td className="px-4 py-3 text-sm">Third-party (Stripe)</td>
                  </tr>
                </tbody>
              </table>

              <p><strong>Privacy Policy</strong>: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">https://stripe.com/privacy</a></p>

              <h2>4. Third-Party Services</h2>
              
              <h3>4.1 Stripe (Payment Processing)</h3>
              <ul>
                <li><strong>Cookies Set</strong>: Fraud detection, payment security</li>
                <li><strong>Privacy Policy</strong>: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">https://stripe.com/privacy</a></li>
                <li><strong>Control</strong>: Cannot be disabled for payment transactions</li>
              </ul>

              <h3>4.2 OpenAI (AI Processing)</h3>
              <ul>
                <li><strong>Cookies Set</strong>: None (API-only integration)</li>
                <li><strong>Privacy Policy</strong>: <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer">https://openai.com/privacy</a></li>
                <li><strong>Data Handling</strong>: Zero data retention per OpenAI API terms</li>
              </ul>

              <h2>5. Managing Cookies</h2>
              
              <h3>5.1 Browser Controls</h3>
              
              <p><strong>Chrome:</strong></p>
              <ol>
                <li>Settings → Privacy and security → Cookies and other site data</li>
                <li>Choose blocking preferences</li>
                <li>View and delete existing cookies</li>
              </ol>

              <p><strong>Firefox:</strong></p>
              <ol>
                <li>Settings → Privacy & Security → Cookies and Site Data</li>
                <li>Manage cookie exceptions</li>
                <li>Clear stored cookies</li>
              </ol>

              <h2>6. Impact of Disabling Cookies</h2>
              
              <h3>6.1 Essential Cookies Disabled</h3>
              <p>If you block essential cookies:</p>
              <ul>
                <li>Cannot log in to your account</li>
                <li>Cannot maintain active session</li>
                <li>Cannot process payments</li>
                <li>Security features may not work</li>
              </ul>
              <p><strong>Recommendation</strong>: Do not disable essential cookies.</p>

              <h2>7. Contact Us</h2>
              <p>For questions about our use of cookies:</p>
              <p>
                <strong>Email</strong>: <a href="mailto:askeunoanalytics@gmail.com">askeunoanalytics@gmail.com</a><br />
                <strong>Phone</strong>: 727-222-2519<br />
                <strong>Subject Line</strong>: Cookie Policy Inquiry
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