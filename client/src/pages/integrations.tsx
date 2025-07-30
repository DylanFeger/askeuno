import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Database, ShoppingCart, BarChart3, Users, Cloud, FileSpreadsheet, Code, Search, Lock, Zap, CreditCard, Building2 } from 'lucide-react';
import { SiMysql, SiPostgresql, SiMongodb, SiAmazons3, SiGooglesheets, SiSalesforce, SiShopify, SiGoogleads, SiStripe, SiSquare, SiPaypal, SiIntuit } from 'react-icons/si';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'wouter';
import EunoLogo from '@/components/EunoLogo';
import { useState } from 'react';

export default function Integrations() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const integrations = [
    {
      category: 'Databases',
      icon: Database,
      items: [
        {
          name: 'MySQL',
          icon: SiMysql,
          description: 'Structured data for transactions & orders.',
          status: 'available',
          syncType: 'Direct connection'
        },
        {
          name: 'PostgreSQL',
          icon: SiPostgresql,
          description: 'Advanced database for large data sets.',
          status: 'available',
          syncType: 'Direct connection'
        },
        {
          name: 'MongoDB',
          icon: SiMongodb,
          description: 'Flexible NoSQL document storage.',
          status: 'available',
          syncType: 'Direct connection'
        }
      ]
    },
    {
      category: 'Cloud Storage',
      icon: Cloud,
      items: [
        {
          name: 'AWS S3',
          icon: SiAmazons3,
          description: 'Store large files and datasets securely.',
          status: 'available',
          syncType: 'API access'
        }
      ]
    },
    {
      category: 'Spreadsheets',
      icon: FileSpreadsheet,
      items: [
        {
          name: 'Google Sheets',
          icon: SiGooglesheets,
          description: 'Connect via CSV/Excel upload - no complex auth needed.',
          status: 'available',
          syncType: 'Manual upload'
        },
        {
          name: 'Excel Uploads',
          icon: FileSpreadsheet,
          description: 'Direct Excel file uploads for instant analysis.',
          status: 'available',
          syncType: 'Manual upload'
        }
      ]
    },

    {
      category: 'E-commerce',
      icon: ShoppingCart,
      items: [
        {
          name: 'Shopify',
          icon: SiShopify,
          description: 'Bring in orders, products, and customer info.',
          status: 'available',
          syncType: 'API connection'
        }
      ]
    },
    {
      category: 'Payment Processors',
      icon: CreditCard,
      items: [
        {
          name: 'Stripe',
          icon: SiStripe,
          description: 'Automatically sync payments, customers, and subscriptions.',
          status: 'available',
          syncType: 'Real-time webhooks'
        },
        {
          name: 'Square',
          icon: SiSquare,
          description: 'Import transactions and inventory from your POS system.',
          status: 'available',
          syncType: 'Real-time webhooks'
        },
        {
          name: 'PayPal',
          icon: SiPaypal,
          description: 'Track payments, refunds, and transaction fees.',
          status: 'available',
          syncType: 'API + Webhooks'
        }
      ]
    },
    {
      category: 'Accounting Software',
      icon: Building2,
      items: [
        {
          name: 'QuickBooks',
          icon: SiIntuit,
          description: 'Sync invoices, expenses, and financial reports.',
          status: 'available',
          syncType: 'API connection'
        }
      ]
    },
    {
      category: 'Custom API',
      icon: Code,
      items: [
        {
          name: 'Custom API',
          icon: Code,
          description: 'Connect your own systems your way.',
          status: 'available',
          syncType: 'Flexible integration'
        }
      ]
    }
  ];

  // Filter integrations based on search query
  const filteredIntegrations = integrations.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Euno plays well with your tools
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Connect your business data in real time or manually — Euno keeps everything simple and secure.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 w-full text-lg"
            />
          </div>
        </div>
      </section>

      {/* Integrations List */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-12">
            {filteredIntegrations.map((category, categoryIndex) => {
              const CategoryIcon = category.icon;
              return (
                <motion.div
                  key={category.category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
                >
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <CategoryIcon className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900">{category.category}</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.items.map((item, itemIndex) => {
                      const ItemIcon = item.icon;
                      return (
                        <motion.div
                          key={item.name}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: categoryIndex * 0.1 + itemIndex * 0.05 }}
                        >
                          <Card className={`p-6 hover:shadow-lg transition-shadow ${
                            item.status === 'coming-soon' ? 'opacity-75' : ''
                          }`}>
                            <div className="flex items-start space-x-4">
                              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <ItemIcon className="w-8 h-8 text-gray-700" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                  {item.name}
                                </h3>
                                <p className="text-gray-600 text-sm mb-2">
                                  {item.description}
                                </p>
                                <div className="flex items-center space-x-2 text-sm">
                                  <Zap className="w-4 h-4 text-primary" />
                                  <span className="text-primary font-medium">{item.syncType}</span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Lock className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-semibold text-gray-900">How It Works</h2>
            </div>
            <p className="text-lg text-gray-700 leading-relaxed">
              Connect your data live or upload files manually. Euno keeps your connections secure and up to date. 
              Our real-time sync ensures you always have the latest data, while manual uploads give you control 
              over when and what data to analyze. All connections are encrypted and isolated per business, 
              so your data stays private and secure.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to connect?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Get started free today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button size="lg" className="px-8">
                Get Started Free
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="px-8">
                Don't see your tool? Let's build it
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}