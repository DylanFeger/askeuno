import { Link } from 'wouter';
import EunoLogo from './EunoLogo';
import EmailWithCopy from './EmailWithCopy';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <Link href="/">
              <div className="flex items-center space-x-3 mb-4 cursor-pointer hover:opacity-80 transition-opacity">
                <EunoLogo className="w-8 h-8" />
                <span className="text-xl font-bold">Euno</span>
              </div>
            </Link>
            <p className="text-gray-400">Making business data simple and actionable for everyone.</p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/subscription" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              <li><Link href="/integrations" className="hover:text-white transition-colors">Integrations</Link></li>
              <li><Link href="/cost-of-bad-query" className="hover:text-white transition-colors">The Cost of a Bad Query</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/resources" className="hover:text-white transition-colors">Resources</Link></li>
              <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li className="flex items-center">
                <EmailWithCopy email="support@askeuno.com" className="text-gray-400 hover:text-white transition-colors" />
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Team</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/team-culture" className="hover:text-white transition-colors">Culture</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>Powered by AI — Ask Euno at your own risk</p>
          <p>© 2025 AskEuno. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}