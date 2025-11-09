import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';

export default function RefundPolicy() {
  useEffect(() => {
    document.title = 'Refund Policy - Euno';
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <div className="prose prose-gray max-w-none">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Refund Policy</h1>
              <p className="text-gray-600 mb-8">Last Updated: October 23, 2025</p>

              <p>At Euno, we want you to be completely satisfied with our service. This Refund Policy outlines our approach to refunds and cancellations.</p>

              <h2>1. Overview</h2>
              <p>We offer a fair and transparent refund policy designed to protect both you and Euno. Please review this policy carefully before subscribing.</p>

              <h2>2. Starter (Free) Tier</h2>
              <p>The Starter tier is free and does not involve any payments. No refunds are applicable.</p>

              <h2>3. Paid Subscriptions (Professional & Enterprise)</h2>
              
              <h3>3.1 30-Day Money-Back Guarantee</h3>
              <p><strong>For New Subscribers:</strong></p>
              <ul>
                <li>Full refund available within 30 days of your first payment</li>
                <li>Applies to both monthly and annual subscriptions</li>
                <li>No questions asked</li>
              </ul>

              <p><strong>How to Request:</strong></p>
              <ul>
                <li>Email <a href="mailto:support@askeuno.com">support@askeuno.com</a> with subject "Refund Request"</li>
                <li>Include your account email and reason (optional)</li>
                <li>Refunds processed within 5-7 business days</li>
              </ul>

              <h3>3.2 After 30 Days</h3>
              <p><strong>Monthly Subscriptions:</strong></p>
              <ul>
                <li>No refunds for partial months</li>
                <li>You may cancel anytime to prevent future charges</li>
                <li>Access continues until end of current billing period</li>
              </ul>

              <p><strong>Annual Subscriptions:</strong></p>
              <ul>
                <li>Pro-rated refunds available for remaining months</li>
                <li>Calculated as: (Months Remaining / 12) × Annual Price</li>
                <li>Minimum retention: 3 months (no refund if less than 9 months remaining)</li>
              </ul>

              <p><strong>Example:</strong><br />
              If you paid $1,009 for Professional Annual and cancel after 4 months:<br />
              Refund = (8 / 12) × $1,009 = $672.67</p>

              <h2>4. Subscription Changes</h2>
              
              <h3>4.1 Upgrades (Starter → Professional → Enterprise)</h3>
              <ul>
                <li>Immediate access to new tier features</li>
                <li>Pro-rated charge for remainder of billing period</li>
                <li>No refund for previous tier</li>
              </ul>

              <h3>4.2 Downgrades (Enterprise → Professional → Starter)</h3>
              <ul>
                <li>Change takes effect at end of current billing period</li>
                <li>No partial refunds for current period</li>
                <li>Access to current tier features until period ends</li>
              </ul>

              <h2>5. Cancellations</h2>
              
              <h3>5.1 How to Cancel</h3>
              <p><strong>Self-Service:</strong></p>
              <ol>
                <li>Log into your Euno account</li>
                <li>Go to Settings → Subscription</li>
                <li>Click "Cancel Subscription"</li>
                <li>Confirm cancellation</li>
              </ol>

              <p><strong>Via Email:</strong></p>
              <ul>
                <li>Send request to <a href="mailto:support@askeuno.com">support@askeuno.com</a></li>
                <li>Include account email</li>
                <li>We'll confirm within 24 hours</li>
              </ul>

              <h3>5.2 Effective Date</h3>
              <ul>
                <li>Cancellation takes effect at end of current billing period</li>
                <li>You retain access until period ends</li>
                <li>No partial refunds unless within 30-day window</li>
              </ul>

              <h3>5.3 Data After Cancellation</h3>
              <ul>
                <li>You have 30 days to export your data</li>
                <li>After 30 days, all data is permanently deleted</li>
                <li>Download your data before canceling</li>
              </ul>

              <h2>6. Payment Failures</h2>
              
              <h3>6.1 Failed Payments</h3>
              <p>If your payment fails:</p>
              <ul>
                <li>Day 1: Email notification to update payment method</li>
                <li>Day 3: Second reminder</li>
                <li>Day 7: Final notice</li>
                <li>Day 8: Account downgraded to Starter tier</li>
              </ul>

              <h3>6.2 Grace Period</h3>
              <ul>
                <li>7-day grace period to update payment information</li>
                <li>Full access maintained during grace period</li>
                <li>No refunds for service during grace period</li>
              </ul>

              <h2>7. Refund Processing</h2>
              
              <h3>7.1 Timeline</h3>
              <ul>
                <li>Approval: Within 2 business days</li>
                <li>Processing: 5-7 business days</li>
                <li>Bank processing: 5-10 business days (varies by bank)</li>
                <li>Total time: Up to 3 weeks from request to account credit</li>
              </ul>

              <h3>7.2 Refund Method</h3>
              <ul>
                <li>Refunds issued to original payment method</li>
                <li>Same card/account used for payment</li>
                <li>Cannot refund to different payment method</li>
              </ul>

              <h2>8. Contact Information</h2>
              <p>For questions about our Refund Policy:</p>
              <p>
                <strong>Email</strong>: <a href="mailto:support@askeuno.com">support@askeuno.com</a><br />
                <strong>Response Time</strong>: Within 24 hours
              </p>

              <h2>Quick Reference</h2>
              <table className="min-w-full divide-y divide-gray-200 my-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scenario</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Refund Available?</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timeline</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm">First 30 days (any tier)</td>
                    <td className="px-4 py-3 text-sm">Full refund</td>
                    <td className="px-4 py-3 text-sm">Immediate</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">Monthly after 30 days</td>
                    <td className="px-4 py-3 text-sm">No refund</td>
                    <td className="px-4 py-3 text-sm">Cancel anytime</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">Annual after 30 days</td>
                    <td className="px-4 py-3 text-sm">Pro-rated refund</td>
                    <td className="px-4 py-3 text-sm">Remaining months</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">Downgrade</td>
                    <td className="px-4 py-3 text-sm">No refund</td>
                    <td className="px-4 py-3 text-sm">Effective next period</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">Payment failure</td>
                    <td className="px-4 py-3 text-sm">No refund</td>
                    <td className="px-4 py-3 text-sm">7-day grace period</td>
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