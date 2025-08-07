import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, BarChart, PieChart, LineChart, Activity, Calculator, Target } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

export default function BusinessAnalyticsGuide() {
  return (
    <>
      <SEO 
        title="Business Analytics 101: A Small Business Guide | AskEuno"
        description="Everything you need to know about business analytics — from basic concepts to advanced strategies for growth."
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
                <BarChart className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                Business Analytics 101: A Small Business Guide
              </h1>
              <p className="text-xl text-gray-600">
                Master the fundamentals of analytics to unlock your business potential
              </p>
            </header>
            
            {/* Main Content */}
            <div className="prose prose-lg max-w-none">
              <Card className="p-8 mb-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <p className="text-lg text-gray-700 mb-0">
                  Business analytics transforms raw data into strategic advantage. Whether you're tracking sales, 
                  understanding customers, or optimizing operations, analytics provides the insights you need to 
                  compete and grow. This comprehensive guide breaks down everything small business owners need to 
                  know about analytics — without the jargon or complexity.
                </p>
              </Card>
              
              <section className="mb-10">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
                  <Activity className="w-6 h-6 text-primary" />
                  What Is Business Analytics?
                </h2>
                <p className="text-gray-700 mb-4">
                  Business analytics is the practice of using data to understand your business performance, identify 
                  opportunities, and make better decisions. It's like having a GPS for your business — showing you 
                  where you are, where you're going, and the best route to get there.
                </p>
                <p className="text-gray-700 mb-4">
                  At its core, analytics answers three fundamental questions:
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <span className="font-semibold text-primary">What happened?</span>
                    <span className="text-gray-700">(Descriptive analytics)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-semibold text-primary">Why did it happen?</span>
                    <span className="text-gray-700">(Diagnostic analytics)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-semibold text-primary">What will happen?</span>
                    <span className="text-gray-700">(Predictive analytics)</span>
                  </li>
                </ul>
                <p className="text-gray-700">
                  For small businesses, even basic descriptive analytics can be transformative. Understanding what's 
                  happening in your business — which products sell best, when customers buy, where profits come from — 
                  provides the foundation for smarter decisions and sustainable growth.
                </p>
              </section>
              
              <section className="mb-10">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
                  <PieChart className="w-6 h-6 text-primary" />
                  The Four Types of Business Analytics
                </h2>
                
                <div className="space-y-6">
                  <Card className="p-6 border-l-4 border-blue-500">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      1. Descriptive Analytics: What Happened?
                    </h3>
                    <p className="text-gray-700 mb-3">
                      This is your business's story told through numbers. Descriptive analytics summarizes historical 
                      data to show patterns and trends. It's the foundation of all analytics work.
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Examples:</strong>
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Monthly sales reports showing revenue trends</li>
                        <li>• Customer demographics breakdown</li>
                        <li>• Inventory turnover rates</li>
                        <li>• Website traffic patterns</li>
                      </ul>
                    </div>
                  </Card>
                  
                  <Card className="p-6 border-l-4 border-green-500">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      2. Diagnostic Analytics: Why Did It Happen?
                    </h3>
                    <p className="text-gray-700 mb-3">
                      Diagnostic analytics digs deeper to understand the causes behind your data patterns. It helps 
                      you understand not just what happened, but why it happened.
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Examples:</strong>
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Why did sales drop 20% last month? (Supply chain issues)</li>
                        <li>• What drives customer churn? (Poor onboarding experience)</li>
                        <li>• Why are margins declining? (Rising supplier costs)</li>
                        <li>• What causes cart abandonment? (Unexpected shipping costs)</li>
                      </ul>
                    </div>
                  </Card>
                  
                  <Card className="p-6 border-l-4 border-purple-500">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      3. Predictive Analytics: What Will Happen?
                    </h3>
                    <p className="text-gray-700 mb-3">
                      Using historical data and statistical models, predictive analytics forecasts future outcomes. 
                      It helps you anticipate trends and prepare for what's coming.
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Examples:</strong>
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Sales forecasting for inventory planning</li>
                        <li>• Customer lifetime value predictions</li>
                        <li>• Seasonal demand patterns</li>
                        <li>• Risk assessment for credit decisions</li>
                      </ul>
                    </div>
                  </Card>
                  
                  <Card className="p-6 border-l-4 border-orange-500">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      4. Prescriptive Analytics: What Should We Do?
                    </h3>
                    <p className="text-gray-700 mb-3">
                      The most advanced form, prescriptive analytics recommends specific actions to achieve desired 
                      outcomes. It combines insights with optimization algorithms.
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Examples:</strong>
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Optimal pricing strategies for maximum profit</li>
                        <li>• Best marketing channel mix for ROI</li>
                        <li>• Ideal inventory levels by location</li>
                        <li>• Personalized product recommendations</li>
                      </ul>
                    </div>
                  </Card>
                </div>
              </section>
              
              <section className="mb-10">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
                  <Calculator className="w-6 h-6 text-primary" />
                  Essential Metrics Every Business Should Track
                </h2>
                <p className="text-gray-700 mb-6">
                  While every business is unique, certain metrics are universally valuable. Here are the key 
                  performance indicators (KPIs) that provide the clearest picture of business health:
                </p>
                
                <div className="grid gap-4">
                  <Card className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Financial Metrics</h3>
                    <ul className="text-gray-700 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Revenue Growth Rate:</span>
                        <span>Month-over-month or year-over-year revenue changes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Gross Profit Margin:</span>
                        <span>(Revenue - Cost of Goods Sold) / Revenue</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Cash Flow:</span>
                        <span>Money coming in vs. going out</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Burn Rate:</span>
                        <span>How quickly you're spending capital</span>
                      </li>
                    </ul>
                  </Card>
                  
                  <Card className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Customer Metrics</h3>
                    <ul className="text-gray-700 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Customer Acquisition Cost (CAC):</span>
                        <span>Total sales/marketing costs / New customers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Customer Lifetime Value (CLV):</span>
                        <span>Average purchase value × Purchase frequency × Customer lifespan</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Churn Rate:</span>
                        <span>Percentage of customers who stop buying</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Net Promoter Score (NPS):</span>
                        <span>Customer satisfaction and loyalty indicator</span>
                      </li>
                    </ul>
                  </Card>
                  
                  <Card className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Operational Metrics</h3>
                    <ul className="text-gray-700 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Inventory Turnover:</span>
                        <span>How quickly inventory sells and is replaced</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Order Fulfillment Time:</span>
                        <span>Time from order to delivery</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Employee Productivity:</span>
                        <span>Revenue or output per employee</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Conversion Rate:</span>
                        <span>Percentage of leads that become customers</span>
                      </li>
                    </ul>
                  </Card>
                </div>
              </section>
              
              <section className="mb-10">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
                  <LineChart className="w-6 h-6 text-primary" />
                  Building Your Analytics Foundation
                </h2>
                <p className="text-gray-700 mb-6">
                  Starting with analytics doesn't require a massive investment or technical expertise. Follow this 
                  step-by-step approach to build a solid analytics foundation:
                </p>
                
                <div className="space-y-4">
                  <Card className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Step 1: Organize Your Data</h3>
                    <p className="text-gray-700 mb-3">
                      Start by centralizing your business data. This includes sales records, customer information, 
                      inventory data, and financial records. Even simple spreadsheets work initially.
                    </p>
                    <div className="bg-primary/5 p-3 rounded">
                      <p className="text-sm text-gray-600">
                        <strong>Action:</strong> Create a single source of truth for each data type. Use consistent 
                        formats and regular update schedules.
                      </p>
                    </div>
                  </Card>
                  
                  <Card className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Step 2: Define Your Questions</h3>
                    <p className="text-gray-700 mb-3">
                      List the specific questions you want analytics to answer. Start with 3-5 critical questions 
                      that would significantly impact your decision-making.
                    </p>
                    <div className="bg-primary/5 p-3 rounded">
                      <p className="text-sm text-gray-600">
                        <strong>Action:</strong> Write down your top business challenges and translate them into 
                        data questions.
                      </p>
                    </div>
                  </Card>
                  
                  <Card className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Step 3: Choose Your Tools</h3>
                    <p className="text-gray-700 mb-3">
                      Select analytics tools that match your technical skills and budget. Start simple — even 
                      Excel can be powerful for basic analytics.
                    </p>
                    <div className="bg-primary/5 p-3 rounded">
                      <p className="text-sm text-gray-600">
                        <strong>Action:</strong> Tools like AskEuno eliminate technical barriers by letting you 
                        ask questions in plain English and get visual answers instantly.
                      </p>
                    </div>
                  </Card>
                  
                  <Card className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Step 4: Create Regular Reports</h3>
                    <p className="text-gray-700 mb-3">
                      Establish a routine for reviewing your analytics. Weekly or monthly dashboards help you 
                      spot trends and catch issues early.
                    </p>
                    <div className="bg-primary/5 p-3 rounded">
                      <p className="text-sm text-gray-600">
                        <strong>Action:</strong> Set up automated reports for your key metrics. Review them at 
                        consistent intervals.
                      </p>
                    </div>
                  </Card>
                  
                  <Card className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Step 5: Act on Insights</h3>
                    <p className="text-gray-700 mb-3">
                      Analytics only creates value when you act on the insights. Create a process for turning 
                      data discoveries into business actions.
                    </p>
                    <div className="bg-primary/5 p-3 rounded">
                      <p className="text-sm text-gray-600">
                        <strong>Action:</strong> For each insight, document the action taken and track the results. 
                        Build a culture of data-driven experimentation.
                      </p>
                    </div>
                  </Card>
                </div>
              </section>
              
              <section className="mb-10">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
                  <Target className="w-6 h-6 text-primary" />
                  Advanced Analytics Strategies
                </h2>
                <p className="text-gray-700 mb-6">
                  Once you've mastered the basics, these advanced strategies can take your analytics to the next level:
                </p>
                
                <div className="space-y-4">
                  <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Cohort Analysis</h3>
                    <p className="text-gray-700 text-sm">
                      Group customers by shared characteristics (acquisition date, first purchase, location) to 
                      understand behavior patterns and improve retention strategies.
                    </p>
                  </Card>
                  
                  <Card className="p-4 bg-gradient-to-r from-green-50 to-teal-50 border-green-200">
                    <h3 className="font-semibold text-gray-900 mb-2">A/B Testing</h3>
                    <p className="text-gray-700 text-sm">
                      Test two versions of something (pricing, marketing messages, website layouts) to see which 
                      performs better. Let data decide, not opinions.
                    </p>
                  </Card>
                  
                  <Card className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Predictive Modeling</h3>
                    <p className="text-gray-700 text-sm">
                      Use historical patterns to forecast future outcomes. Predict which customers might churn, 
                      what products will trend, or when demand will spike.
                    </p>
                  </Card>
                  
                  <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Cross-Functional Analytics</h3>
                    <p className="text-gray-700 text-sm">
                      Connect data from different departments (sales + marketing + customer service) to get a 
                      complete picture of business performance and customer journey.
                    </p>
                  </Card>
                </div>
              </section>
              
              <section className="mb-10">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Common Analytics Mistakes to Avoid
                </h2>
                
                <div className="space-y-3">
                  <Card className="p-4 border-l-4 border-red-500">
                    <p className="text-gray-700">
                      <strong>Vanity Metrics:</strong> Don't focus on metrics that look good but don't drive 
                      business value. Website visits mean nothing if they don't convert to sales.
                    </p>
                  </Card>
                  
                  <Card className="p-4 border-l-4 border-red-500">
                    <p className="text-gray-700">
                      <strong>Data Silos:</strong> When different departments keep data separate, you miss 
                      connections and insights. Break down silos for complete visibility.
                    </p>
                  </Card>
                  
                  <Card className="p-4 border-l-4 border-red-500">
                    <p className="text-gray-700">
                      <strong>Perfect Over Good:</strong> Waiting for perfect data means never starting. Begin 
                      with what you have and improve data quality over time.
                    </p>
                  </Card>
                  
                  <Card className="p-4 border-l-4 border-red-500">
                    <p className="text-gray-700">
                      <strong>Ignoring Seasonality:</strong> Many businesses have natural cycles. Don't panic 
                      about a slow January if it's always slow, or get overconfident about a great December.
                    </p>
                  </Card>
                </div>
              </section>
              
              <section className="mb-10">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  The ROI of Business Analytics
                </h2>
                <p className="text-gray-700 mb-4">
                  Investing in analytics delivers measurable returns. Studies show that data-driven companies are:
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="p-4 text-center">
                    <div className="text-3xl font-bold text-primary mb-2">23x</div>
                    <p className="text-gray-700">More likely to acquire customers</p>
                  </Card>
                  
                  <Card className="p-4 text-center">
                    <div className="text-3xl font-bold text-primary mb-2">6x</div>
                    <p className="text-gray-700">More likely to retain customers</p>
                  </Card>
                  
                  <Card className="p-4 text-center">
                    <div className="text-3xl font-bold text-primary mb-2">19x</div>
                    <p className="text-gray-700">More likely to be profitable</p>
                  </Card>
                  
                  <Card className="p-4 text-center">
                    <div className="text-3xl font-bold text-primary mb-2">5%</div>
                    <p className="text-gray-700">Higher productivity on average</p>
                  </Card>
                </div>
                
                <p className="text-gray-700 mt-6">
                  For small businesses, even basic analytics implementation typically yields 10-20% improvement in 
                  operational efficiency and 15-25% better marketing ROI within the first year.
                </p>
              </section>
              
              {/* CTA Section */}
              <Card className="p-8 bg-gradient-to-br from-primary/10 to-primary/20 border-primary/30 mb-10">
                <div className="text-center">
                  <BarChart className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Start Your Analytics Journey Today
                  </h3>
                  <p className="text-gray-700 mb-6">
                    AskEuno makes business analytics accessible to everyone. Connect your data sources and start 
                    getting actionable insights immediately — no technical expertise required.
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
                      Do I need a data analyst to use business analytics?
                    </h3>
                    <p className="text-gray-700">
                      Not anymore. Modern tools like AskEuno are designed for business owners, not data scientists. 
                      You can ask questions in plain English and get visual answers without understanding databases, 
                      SQL, or statistics. The technology handles the complexity while you focus on insights.
                    </p>
                  </Card>
                  
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      How long before I see results from analytics?
                    </h3>
                    <p className="text-gray-700">
                      Many businesses see immediate value from basic descriptive analytics — understanding current 
                      performance, identifying quick wins, and spotting obvious problems. More strategic benefits 
                      like improved forecasting and optimization typically emerge within 2-3 months of consistent use.
                    </p>
                  </Card>
                  
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      What's the difference between analytics and reporting?
                    </h3>
                    <p className="text-gray-700">
                      Reporting tells you what happened (last month's sales were $50K). Analytics tells you why it 
                      happened, predicts what will happen next, and recommends actions. Analytics is interactive and 
                      exploratory, while reporting is typically static and retrospective.
                    </p>
                  </Card>
                </div>
              </section>
              
              {/* Related Resources */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Keep Learning</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Link href="/resources/sql-for-small-business">
                    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        What Is SQL and Why Small Businesses Need It
                      </h3>
                      <p className="text-sm text-gray-600">
                        Understand the technology powering modern analytics.
                      </p>
                    </Card>
                  </Link>
                  
                  <Link href="/resources/data-driven-decisions">
                    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        How to Make Data-Driven Decisions
                      </h3>
                      <p className="text-sm text-gray-600">
                        A practical framework for using analytics in decision-making.
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