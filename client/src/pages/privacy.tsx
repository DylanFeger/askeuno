import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Shield, Lock, Cookie, Mail } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Euno
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-lg text-gray-600">Last updated: January 9, 2025</p>
        </div>

        <div className="space-y-8">
          {/* Introduction */}
          <Card className="p-8">
            <p className="text-gray-700 leading-relaxed">
              At Euno, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your information when you use our data analytics platform. We're committed to being transparent about our practices and giving you control over your data.
            </p>
          </Card>

          {/* What We Collect */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-gray-900">What Data We Collect</h2>
            </div>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-medium mb-2">Business Data Files</h3>
                <p>• Uploaded files in CSV, Excel, and JSON formats</p>
                <p>• Connected account data from services like Google Sheets and QuickBooks (coming soon)</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Account Information</h3>
                <p>• Your name and email address</p>
                <p>• Username and encrypted password</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Payment Information</h3>
                <p>• Payment details are processed securely by Stripe</p>
                <p>• We never store your credit card numbers directly</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">AI Chat Logs</h3>
                <p>• Questions you ask and conversations with our AI assistant</p>
                <p>• This helps us provide context-aware answers and improve our service</p>
              </div>
            </div>
          </Card>

          {/* How We Use Data */}
          <Card className="p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Data</h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>To securely store, process, and analyze your business data</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>To provide real-time AI-powered answers about your data</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>To send scheduled reports and insights</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>To improve Hyppo's features and performance</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>To send important account notifications and updates</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>To process payments through our secure partner, Stripe</span>
              </li>
            </ul>
          </Card>

          {/* Data Security */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-gray-900">Data Security</h2>
            </div>
            <div className="space-y-3 text-gray-700">
              <p>Your data security is our top priority. Here's how we protect your information:</p>
              <ul className="space-y-2 ml-4">
                <li>• All data is stored on secure AWS servers with encryption at rest</li>
                <li>• Every connection to Hyppo uses HTTPS encryption</li>
                <li>• We never share or sell your data to third parties</li>
                <li>• Only you and authorized users on your account can access your uploaded data</li>
                <li>• We regularly review and update our security practices</li>
              </ul>
            </div>
          </Card>

          {/* Cookie Policy */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <Cookie className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-gray-900">Cookie Policy</h2>
            </div>
            <div className="space-y-3 text-gray-700">
              <p>We use cookies to make Euno work better for you:</p>
              <ul className="space-y-2 ml-4">
                <li>• <strong>Session cookies</strong> keep you logged in while you use Euno</li>
                <li>• <strong>Analytics cookies</strong> help us understand how to improve our service</li>
              </ul>
              <p className="mt-4">You can manage cookie preferences in your browser settings. Note that disabling cookies may affect some features of Euno.</p>
            </div>
          </Card>

          {/* User Rights */}
          <Card className="p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Rights</h2>
            <div className="space-y-4 text-gray-700">
              <p>You have control over your data. Here are your rights:</p>
              <div>
                <h3 className="font-medium mb-2">Data Access & Portability</h3>
                <p>You can download all your data at any time from your account settings.</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Account Deletion</h3>
                <p>To delete your account and all associated data, please contact us at support@euno.com. We'll process your request within 30 days.</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Privacy Concerns</h3>
                <p>If you have any questions or concerns about how we handle your data, please reach out to us. We're here to help!</p>
              </div>
            </div>
          </Card>

          {/* Contact */}
          <Card className="p-8 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-gray-900">Contact Us</h2>
            </div>
            <div className="space-y-3 text-gray-700">
              <p>Have questions about this Privacy Policy or how we handle your data?</p>
              <p>We're here to help!</p>
              <div className="mt-4">
                <p className="font-medium">Email us at:</p>
                <a href="mailto:support@euno.com" className="text-primary hover:underline text-lg">
                  support@euno.com
                </a>
              </div>
              <p className="text-sm mt-4">We typically respond within 24 business hours.</p>
            </div>
          </Card>

          {/* Updates */}
          <Card className="p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Updates to This Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time to reflect changes in our practices or for legal reasons. 
              When we make significant changes, we'll notify you by email and update the "Last updated" date at the top of this page.
            </p>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-600">
          <p>© 2025 Euno. All rights reserved.</p>
          <Link href="/">
            <Button variant="link" className="mt-2">
              Return to Euno
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}