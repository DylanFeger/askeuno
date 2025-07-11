import { Book, Zap, Database, MessageSquare, Settings, HelpCircle, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import HyppoLogo from '@/components/HyppoLogo';
import Footer from '@/components/Footer';

export default function Documentation() {
  const guides = [
    {
      category: 'Getting Started',
      icon: Zap,
      items: [
        {
          title: 'Quick Start Guide',
          description: 'Get up and running with Acre in under 5 minutes',
          link: '#quick-start'
        },
        {
          title: 'Your First Data Connection',
          description: 'Learn how to connect your first data source',
          link: '#first-connection'
        },
        {
          title: 'Understanding the Chat Interface',
          description: 'Master the art of asking questions to get insights',
          link: '#chat-interface'
        }
      ]
    },
    {
      category: 'Data Sources',
      icon: Database,
      items: [
        {
          title: 'Connecting Databases',
          description: 'Set up MySQL, PostgreSQL, or MongoDB connections',
          link: '#databases'
        },
        {
          title: 'File Uploads',
          description: 'Upload and process Excel, CSV, and JSON files',
          link: '#file-uploads'
        },
        {
          title: 'API Integrations',
          description: 'Connect to Shopify, Stripe, and other APIs',
          link: '#api-integrations'
        }
      ]
    },
    {
      category: 'Using AI Chat',
      icon: MessageSquare,
      items: [
        {
          title: 'Effective Questions',
          description: 'Learn how to ask questions that get the best answers',
          link: '#effective-questions'
        },
        {
          title: 'Brief vs Extended Mode',
          description: 'When to use each analysis mode',
          link: '#analysis-modes'
        },
        {
          title: 'Chat History',
          description: 'Navigate and continue previous conversations',
          link: '#chat-history'
        }
      ]
    },
    {
      category: 'Account Management',
      icon: Settings,
      items: [
        {
          title: 'Subscription Plans',
          description: 'Compare plans and manage your subscription',
          link: '#subscriptions'
        },
        {
          title: 'Security Settings',
          description: 'Manage passwords and access controls',
          link: '#security-settings'
        },
        {
          title: 'Data Export',
          description: 'Export your data and insights',
          link: '#data-export'
        }
      ]
    }
  ];

  const faqs = [
    {
      question: 'How secure is my data?',
      answer: 'Your data is encrypted at rest and in transit. Each business has isolated storage, and we never share or sell your data.'
    },
    {
      question: 'Can I connect multiple data sources?',
      answer: 'Yes! The number of data sources depends on your plan. Starter allows 3, Growth allows 20, and Pro is unlimited.'
    },
    {
      question: 'How often does data sync?',
      answer: 'Real-time connections sync continuously. File uploads are processed once. You can manually refresh any data source.'
    },
    {
      question: 'What file formats are supported?',
      answer: 'We support Excel (.xlsx, .xls), CSV, and JSON files up to 500MB in size.'
    },
    {
      question: 'Can I export my insights?',
      answer: 'Yes, you can export chat conversations, data, and insights in various formats.'
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
              <Book className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Documentation & Guides
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Everything you need to know about using Acre. 
            Clear guides to help you get the most from your data.
          </p>
        </div>
      </section>

      {/* Documentation Categories */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {guides.map((category) => {
              const Icon = category.icon;
              return (
                <Card key={category.category} className="p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{category.category}</h2>
                  </div>
                  
                  <div className="space-y-4">
                    {category.items.map((item) => (
                      <a
                        key={item.title}
                        href={item.link}
                        className="block group hover:bg-gray-50 rounded-lg p-4 -m-4 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                              {item.title}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0 ml-4" />
                        </div>
                      </a>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <HelpCircle className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Quick answers to common questions
            </p>
          </div>
          
          <div className="space-y-6">
            {faqs.map((faq) => (
              <Card key={faq.question} className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Need More Help?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Our support team is here to help you succeed with Acre.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" variant="outline">
                Contact Support
              </Button>
            </Link>
            <Button size="lg">
              Schedule a Demo
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}