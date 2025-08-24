import { Zap, Database, MessageSquare, Shield, TrendingUp, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import EunoLogo from '@/components/EunoLogo';
import Footer from '@/components/Footer';

export default function Features() {
  const features = [
    {
      icon: Database,
      title: 'Live Data Connections',
      description: 'Connect directly to your databases, cloud storage, and business apps. Real-time sync keeps your insights current with automatic updates.',
      details: [
        'MySQL, PostgreSQL, MongoDB support',
        'Database connections',
        'API integrations',
        'File uploads for Google Sheets'
      ]
    },
    {
      icon: Zap,
      title: 'Manual File Uploads',
      description: 'Upload Excel, CSV, or JSON files when you need quick insights. Perfect for one-time analysis or when live connections aren\'t needed.',
      details: [
        'Excel (.xlsx, .xls) support',
        'CSV with automatic parsing',
        'JSON data structures',
        'Files up to 500MB'
      ]
    },
    {
      icon: MessageSquare,
      title: 'AI-Powered Chat',
      description: 'Ask questions in plain English and get instant answers. Our AI understands your business context and provides actionable insights.',
      details: [
        'Natural language processing',
        'Context-aware responses',
        'Brief or detailed analysis modes',
        'Conversation history'
      ]
    },
    {
      icon: TrendingUp,
      title: 'Real-Time Insights',
      description: 'Get up-to-date analysis based on your latest data. Spot trends, identify opportunities, and make informed decisions faster.',
      details: [
        'Data analysis and insights',
        'Business recommendations',
        'Query your data naturally',
        'Export results as needed'
      ]
    },
    {
      icon: Clock,
      title: 'Easy Onboarding',
      description: 'Get started in minutes, not days. Our simple setup process guides you through connecting data and asking your first questions.',
      details: [
        '7-day free trial',
        'Guided setup wizard',
        'Email support included'
      ]
    },
    {
      icon: Shield,
      title: 'Security for All',
      description: 'Every user gets the same strong security. We use encryption, isolated storage, and strict access controls.',
      details: [
        'HTTPS encryption for all connections',
        'Password hashing with bcrypt',
        'Data isolation per business',
        'Session-based authentication'
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
                <EunoLogo className="w-8 h-8" />
                <span className="text-xl font-bold text-gray-900">Euno</span>
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
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Features Built for Your Business
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Everything you need to understand your data, nothing you don't. 
            Simple, powerful tools that work the way you think.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="p-8 hover:shadow-lg transition-shadow">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
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

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Data?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of businesses making smarter decisions with Euno.
          </p>
          <Link href="/">
            <Button size="lg" className="px-8">
              Start Your Free Trial
            </Button>
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            7-day free trial
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}