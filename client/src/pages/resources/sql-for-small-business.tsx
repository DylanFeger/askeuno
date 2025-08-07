import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Database, TrendingUp, BarChart, DollarSign, CheckCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

export default function SQLForSmallBusiness() {
  return (
    <>
      <SEO 
        title="What Is SQL and Why Small Businesses Need It | AskEuno"
        description="Learn how SQL helps small businesses gain better insights from their data — and how AskEuno automates it for you."
      />
      
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <Navbar />
        
        {/* Breadcrumb */}
        <div className="pt-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Link href="/resources">
              <Button variant="ghost" className="gap-2 mb-6">
                <ArrowLeft className="w-4 h-4" />
                Back to Resources
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Article Content */}
        <article className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <header className="mb-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
                <Database className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                What Is SQL and Why Does Your Small Business Need It?
              </h1>
              <p className="text-xl text-gray-600">
                Unlock the power of your business data without writing a single line of code
              </p>
            </header>
            
            {/* Main Content */}
            <div className="prose prose-lg max-w-none">
              <Card className="p-8 mb-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <p className="text-lg text-gray-700 mb-0">
                  Every day, your business generates valuable data — from sales transactions to customer interactions. 
                  SQL is the key to unlocking insights from this data, but most small business owners don't have time 
                  to learn it. That's where AskEuno comes in, automating SQL so you can focus on growing your business.
                </p>
              </Card>
              
              <section className="mb-10">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
                  <Database className="w-6 h-6 text-primary" />
                  SQL, Explained Simply
                </h2>
                <p className="text-gray-700 mb-4">
                  SQL (Structured Query Language) is how businesses pull specific answers from their data. Think of it 
                  as a way to ask your business database a question — and get a clear, actionable response.
                </p>
                <p className="text-gray-700 mb-4">
                  Imagine you have thousands of sales records in a spreadsheet. Without SQL, you'd spend hours manually 
                  sorting and calculating to find patterns. With SQL, you can instantly answer questions like "What was 
                  my best-selling product last quarter?" or "Which customers haven't purchased in 90 days?"
                </p>
                <p className="text-gray-700">
                  The challenge is that SQL requires technical knowledge — syntax, database structures, and query 
                  optimization. It's powerful, but it's also complex, which brings us to our next point.
                </p>
              </section>
              
              <section className="mb-10">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Why Most Small Businesses Avoid SQL
                </h2>
                <p className="text-gray-700 mb-4">
                  Most founders don't have the time or technical background to learn SQL — so they rely on confusing 
                  spreadsheets or wait for expensive consultants. Here are the main barriers:
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <span className="text-gray-700">
                      <strong>Steep Learning Curve:</strong> SQL requires understanding database concepts, syntax rules, 
                      and query structure — a significant time investment for busy entrepreneurs.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <span className="text-gray-700">
                      <strong>Technical Infrastructure:</strong> Setting up databases, maintaining them, and ensuring 
                      data security requires IT expertise most small businesses don't have.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <span className="text-gray-700">
                      <strong>Cost of Mistakes:</strong> One wrong query could corrupt your data or provide misleading 
                      insights that lead to poor business decisions.
                    </span>
                  </li>
                </ul>
                <p className="text-gray-700">
                  As a result, valuable business data sits unused in spreadsheets, accounting software, and CRM systems — 
                  full of insights that could drive growth but remain hidden due to technical barriers.
                </p>
              </section>
              
              <section className="mb-10">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  How AskEuno Automates SQL for You
                </h2>
                <p className="text-gray-700 mb-4">
                  AskEuno translates your business questions into real SQL queries in seconds. You don't need to know 
                  syntax, database structures, or query optimization — just ask your question in plain English.
                </p>
                
                <Card className="p-6 mb-6 border-l-4 border-primary">
                  <p className="text-gray-700 mb-3">
                    <strong>You ask:</strong> "Which of my products have the highest profit margin?"
                  </p>
                  <p className="text-gray-700">
                    <strong>Euno delivers:</strong> A visual report showing your products ranked by profit margin, 
                    with charts and insights — no code, no wait.
                  </p>
                </Card>
                
                <p className="text-gray-700 mb-4">
                  Behind the scenes, AskEuno's AI understands your intent, generates the appropriate SQL query, runs it 
                  against your connected data sources, and presents the results in an easy-to-understand format. It's 
                  like having a data analyst on your team, available 24/7.
                </p>
                
                <p className="text-gray-700">
                  This means you get the power of SQL — complex data analysis, cross-platform insights, and instant 
                  answers — without any of the technical complexity. Your focus stays on making strategic decisions, 
                  not wrestling with database queries.
                </p>
              </section>
              
              <section className="mb-10">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
                  <BarChart className="w-6 h-6 text-primary" />
                  What You Can Do With SQL (Through AskEuno)
                </h2>
                <p className="text-gray-700 mb-4">
                  When SQL becomes as easy as asking a question, the possibilities for your business expand dramatically. 
                  Here are real-world applications that drive growth:
                </p>
                
                <div className="grid gap-4 mb-6">
                  <Card className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-primary" />
                      Track Revenue by Channel
                    </h3>
                    <p className="text-gray-700 text-sm">
                      Instantly see which sales channels drive the most revenue. Compare online vs. in-store sales, 
                      identify your most profitable platforms, and allocate resources accordingly.
                    </p>
                  </Card>
                  
                  <Card className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Find Best-Selling Products
                    </h3>
                    <p className="text-gray-700 text-sm">
                      Identify top performers across different time periods, seasons, and customer segments. Stock 
                      inventory smarter and focus marketing on products that actually sell.
                    </p>
                  </Card>
                  
                  <Card className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <BarChart className="w-5 h-5 text-primary" />
                      Calculate Customer Lifetime Value
                    </h3>
                    <p className="text-gray-700 text-sm">
                      Understand which customers are most valuable over time. Focus retention efforts on high-value 
                      segments and optimize acquisition costs based on actual lifetime value.
                    </p>
                  </Card>
                  
                  <Card className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Database className="w-5 h-5 text-primary" />
                      Spot Underperforming Ads
                    </h3>
                    <p className="text-gray-700 text-sm">
                      Connect marketing spend to actual sales. Identify which campaigns deliver ROI and which are 
                      draining your budget without results.
                    </p>
                  </Card>
                </div>
                
                <p className="text-gray-700">
                  These aren't just reports — they're actionable insights that help you make better decisions. 
                  With AskEuno, you can ask follow-up questions, dive deeper into trends, and get recommendations 
                  based on your specific business context.
                </p>
              </section>
              
              {/* CTA Section */}
              <Card className="p-8 bg-gradient-to-br from-primary/10 to-primary/20 border-primary/30 mb-10">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Want answers without learning code?
                  </h3>
                  <p className="text-gray-700 mb-6">
                    Join thousands of business owners who are making smarter decisions with AskEuno. 
                    No credit card required, no technical skills needed.
                  </p>
                  <Link href="/signin">
                    <Button size="lg" className="px-8">
                      Try AskEuno Free
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                </div>
              </Card>
              
              {/* FAQ Section */}
              <section className="faq mb-10">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>
                
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Can I use AskEuno if I've never written SQL?
                    </h3>
                    <p className="text-gray-700">
                      Yes! AskEuno handles all the SQL for you behind the scenes. Just ask your business question 
                      in plain English, and Euno will translate it into the appropriate database query, run it, 
                      and present you with visual results. No coding experience required.
                    </p>
                  </Card>
                  
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Does it work with Shopify or QuickBooks?
                    </h3>
                    <p className="text-gray-700">
                      Yes, AskEuno connects to Shopify, QuickBooks, and many other popular business platforms. 
                      You can run queries across multiple data sources simultaneously, getting a unified view 
                      of your business performance without manual data consolidation.
                    </p>
                  </Card>
                  
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      How secure is my business data?
                    </h3>
                    <p className="text-gray-700">
                      AskEuno uses enterprise-grade encryption for all data transfers and storage. Your data is 
                      protected with the same security standards used by major financial institutions. We're 
                      SOC 2 compliant and never share your data with third parties.
                    </p>
                  </Card>
                </div>
              </section>
              
              {/* Related Resources */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Related Resources</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Link href="/resources/data-driven-decisions">
                    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        How to Make Data-Driven Decisions
                      </h3>
                      <p className="text-sm text-gray-600">
                        Learn the framework for turning data into actionable business strategies.
                      </p>
                    </Card>
                  </Link>
                  
                  <Link href="/resources/business-analytics-guide">
                    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Business Analytics 101
                      </h3>
                      <p className="text-sm text-gray-600">
                        A comprehensive guide to analytics concepts for small businesses.
                      </p>
                    </Card>
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </article>
        
        <Footer />
      </div>
    </>
  );
}