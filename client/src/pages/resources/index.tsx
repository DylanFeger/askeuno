import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, BookOpen, Database, BarChart, TrendingUp } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

const resources = [
  {
    slug: 'sql-for-small-business',
    title: 'What Is SQL and Why Small Businesses Need It',
    description: 'Learn how SQL helps small businesses gain better insights from their data — and how AskEuno automates it for you.',
    icon: Database,
    readTime: '5 min read',
  },
  {
    slug: 'data-driven-decisions',
    title: 'How to Make Data-Driven Decisions for Your Business',
    description: 'Transform your business with data-driven strategies. Learn how to collect, analyze, and act on your business data effectively.',
    icon: TrendingUp,
    readTime: '6 min read',
  },
  {
    slug: 'business-analytics-guide',
    title: 'Business Analytics 101: A Small Business Guide',
    description: 'Everything you need to know about business analytics — from basic concepts to advanced strategies for growth.',
    icon: BarChart,
    readTime: '7 min read',
  },
];

export default function Resources() {
  return (
    <>
      <SEO 
        title="Resources & Guides | Learn Business Analytics | AskEuno"
        description="Free guides on SQL, data analytics, and business intelligence for small businesses. Learn how to make data-driven decisions with AskEuno."
      />
      
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <Navbar />
        
        {/* Hero Section */}
        <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Resources & Guides
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Learn how to transform your business with data. Free guides on SQL, analytics, 
              and making data-driven decisions — no technical background required.
            </p>
          </div>
        </section>
        
        {/* Resources Grid */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {resources.map((resource) => {
                const Icon = resource.icon;
                return (
                  <Link key={resource.slug} href={`/resources/${resource.slug}`}>
                    <Card className="h-full p-6 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer border-gray-200">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <span className="text-sm text-gray-500 mt-1">{resource.readTime}</span>
                      </div>
                      
                      <h2 className="text-xl font-semibold text-gray-900 mb-3">
                        {resource.title}
                      </h2>
                      
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {resource.description}
                      </p>
                      
                      <div className="flex items-center text-primary font-medium">
                        Read Guide
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <Card className="p-8 md:p-12 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Ready to Put These Guides Into Practice?
                </h2>
                <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
                  AskEuno turns these concepts into reality. Connect your data and start getting 
                  insights in plain English — no SQL or technical skills required.
                </p>
                <Link href="/signin">
                  <Button size="lg" className="px-8">
                    Try AskEuno Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </section>
        
        <Footer />
      </div>
    </>
  );
}