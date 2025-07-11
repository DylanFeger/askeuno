import { Shield, Lock, Key, Server, FileCheck, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import HyppoLogo from '@/components/HyppoLogo';
import Footer from '@/components/Footer';

export default function Security() {
  const securityFeatures = [
    {
      icon: Lock,
      title: 'End-to-End Encryption',
      description: 'All data is encrypted in transit and at rest using industry-standard AES-256 encryption.',
      details: [
        'TLS 1.3 for all connections',
        'Encrypted database storage',
        'Secure API communications',
        'Protected file uploads'
      ]
    },
    {
      icon: Key,
      title: 'Authentication & Access Control',
      description: 'Multi-layered security ensures only authorized users can access your data.',
      details: [
        'Secure password hashing (bcrypt)',
        'Session-based authentication',
        'Rate limiting protection',
        'IP-based security monitoring'
      ]
    },
    {
      icon: Server,
      title: 'Infrastructure Security',
      description: 'Built on secure, reliable infrastructure with regular security updates and monitoring.',
      details: [
        'AWS cloud infrastructure',
        'Regular security patches',
        '24/7 system monitoring',
        'Automated backup systems'
      ]
    },
    {
      icon: FileCheck,
      title: 'Data Isolation',
      description: 'Each business has completely isolated data storage and processing.',
      details: [
        'Separate data containers',
        'No cross-business access',
        'Isolated processing queues',
        'Individual encryption keys'
      ]
    },
    {
      icon: Shield,
      title: 'Compliance & Standards',
      description: 'We follow industry best practices and compliance standards to protect your data.',
      details: [
        'SOC 2 Type II compliant',
        'GDPR compliant',
        'Regular security audits',
        'Penetration testing'
      ]
    },
    {
      icon: Users,
      title: 'Privacy First',
      description: 'Your data is your business. We never share, sell, or use your data for anything other than providing you insights.',
      details: [
        'No data sharing',
        'No advertising use',
        'Clear data retention policies',
        'Right to deletion'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
                <AcreLogo className="w-8 h-8 text-primary" />
                <span className="text-xl font-bold text-gray-900">Acre</span>
              </div>
            </Link>
            <Link href="/">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <Shield className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Your Data Security is Our Priority
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            We use bank-level security to protect your business data. 
            Every aspect of Acre is designed with security and privacy in mind.
          </p>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {securityFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="p-8">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                      <p className="text-gray-600 mb-4">{feature.description}</p>
                      <ul className="space-y-2">
                        {feature.details.map((detail) => (
                          <li key={detail} className="flex items-center text-sm text-gray-600">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Security You Can Trust
            </h2>
            <p className="text-xl text-gray-600">
              We take security seriously so you can focus on growing your business.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Our Security Commitments</h3>
            <div className="space-y-4 text-gray-600">
              <p>
                <strong>Regular Updates:</strong> We continuously update our security measures to protect against new threats.
              </p>
              <p>
                <strong>Transparency:</strong> We're open about our security practices and will notify you immediately of any incidents.
              </p>
              <p>
                <strong>Data Ownership:</strong> Your data belongs to you. You can export or delete it at any time.
              </p>
              <p>
                <strong>Minimal Access:</strong> Our team follows strict access controls and only accesses data when absolutely necessary for support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Questions About Security?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            We're happy to discuss our security practices in detail.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button variant="outline" size="lg">
                Contact Security Team
              </Button>
            </Link>
            <Link href="/">
              <Button size="lg">
                Start Secure Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}