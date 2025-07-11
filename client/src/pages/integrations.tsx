import { Database, ShoppingCart, BarChart3, Mail, Cloud, FileSpreadsheet, Globe, Code } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import AcreLogo from '@/components/AcreLogo';
import Footer from '@/components/Footer';

export default function Integrations() {
  const integrations = [
    {
      category: 'E-commerce',
      icon: ShoppingCart,
      items: [
        {
          name: 'Shopify',
          description: 'Sync orders, products, customers, and inventory data in real-time.',
          status: 'available'
        },
        {
          name: 'WooCommerce',
          description: 'Connect your WordPress store data including sales and customer analytics.',
          status: 'available'
        },
        {
          name: 'Amazon Seller',
          description: 'Import sales data, FBA inventory, and performance metrics.',
          status: 'coming-soon'
        }
      ]
    },
    {
      category: 'Marketing & Ads',
      icon: BarChart3,
      items: [
        {
          name: 'Google Ads',
          description: 'Track campaign performance, costs, and ROI across all campaigns.',
          status: 'available'
        },
        {
          name: 'Facebook Ads',
          description: 'Monitor ad spend, impressions, and conversion metrics.',
          status: 'available'
        },
        {
          name: 'Google Analytics',
          description: 'Import website traffic, user behavior, and conversion data.',
          status: 'available'
        }
      ]
    },
    {
      category: 'CRM & Sales',
      icon: Mail,
      items: [
        {
          name: 'Salesforce',
          description: 'Sync leads, opportunities, accounts, and custom objects.',
          status: 'available'
        },
        {
          name: 'HubSpot',
          description: 'Connect contacts, deals, and marketing automation data.',
          status: 'available'
        },
        {
          name: 'Stripe',
          description: 'Import payments, subscriptions, and customer billing data.',
          status: 'available'
        }
      ]
    },
    {
      category: 'Databases',
      icon: Database,
      items: [
        {
          name: 'MySQL',
          description: 'Direct connection to MySQL databases with secure tunneling.',
          status: 'available'
        },
        {
          name: 'PostgreSQL',
          description: 'Full support for PostgreSQL with real-time sync.',
          status: 'available'
        },
        {
          name: 'MongoDB',
          description: 'Connect to MongoDB collections with automatic schema detection.',
          status: 'available'
        }
      ]
    },
    {
      category: 'Cloud Storage',
      icon: Cloud,
      items: [
        {
          name: 'Google Drive',
          description: 'Access spreadsheets and CSV files from your Drive.',
          status: 'available'
        },
        {
          name: 'Dropbox',
          description: 'Sync business files and data stored in Dropbox.',
          status: 'coming-soon'
        },
        {
          name: 'AWS S3',
          description: 'Connect to S3 buckets for large-scale data storage.',
          status: 'available'
        }
      ]
    },
    {
      category: 'Spreadsheets',
      icon: FileSpreadsheet,
      items: [
        {
          name: 'Google Sheets',
          description: 'Real-time sync with Google Sheets, automatic updates.',
          status: 'available'
        },
        {
          name: 'Excel Upload',
          description: 'Upload Excel files (.xlsx, .xls) up to 500MB.',
          status: 'available'
        },
        {
          name: 'CSV Files',
          description: 'Import CSV files with automatic parsing and validation.',
          status: 'available'
        }
      ]
    },
    {
      category: 'Custom APIs',
      icon: Code,
      items: [
        {
          name: 'REST APIs',
          description: 'Connect any REST API with custom authentication.',
          status: 'available'
        },
        {
          name: 'Webhooks',
          description: 'Receive real-time data updates via webhooks.',
          status: 'available'
        },
        {
          name: 'GraphQL',
          description: 'Support for GraphQL endpoints and subscriptions.',
          status: 'coming-soon'
        }
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
              <Globe className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Connect All Your Business Data
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Acre integrates with the tools you already use. 
            Bring all your data together in one secure place.
          </p>
        </div>
      </section>

      {/* Integrations List */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-12">
            {integrations.map((category) => {
              const Icon = category.icon;
              return (
                <div key={category.category}>
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{category.category}</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    {category.items.map((item) => (
                      <Card key={item.name} className="p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                          {item.status === 'coming-soon' && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Custom Integration Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Don't See Your Integration?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            We're always adding new integrations. Let us know what you need, 
            or use our API to build custom connections.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button variant="outline" size="lg">
                Request Integration
              </Button>
            </Link>
            <Link href="/docs">
              <Button size="lg">
                View API Docs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}