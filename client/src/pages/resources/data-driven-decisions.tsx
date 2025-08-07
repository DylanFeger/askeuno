import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, TrendingUp, Target, Brain, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

export default function DataDrivenDecisions() {
  return (
    <>
      <SEO 
        title="How to Make Data-Driven Decisions for Your Business | AskEuno"
        description="Transform your business with data-driven strategies. Learn how to collect, analyze, and act on your business data effectively."
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
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                How to Make Data-Driven Decisions for Your Business
              </h1>
              <p className="text-xl text-gray-600">
                Transform gut feelings into strategic insights with a proven framework
              </p>
            </header>
            
            {/* Main Content */}
            <div className="prose prose-lg max-w-none">
              <Card className="p-8 mb-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <p className="text-lg text-gray-700 mb-0">
                  Every business decision you make — from pricing to inventory to marketing — impacts your bottom line. 
                  Data-driven decision making replaces guesswork with evidence, helping you grow faster while reducing 
                  costly mistakes. This guide shows you exactly how to implement data-driven strategies in your business.
                </p>
              </Card>
              
              <section className="mb-10">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
                  <Brain className="w-6 h-6 text-primary" />
                  What Are Data-Driven Decisions?
                </h2>
                <p className="text-gray-700 mb-4">
                  Data-driven decision making means basing your business choices on actual data analysis rather than 
                  intuition, assumptions, or "how we've always done it." It's about using evidence to guide strategy, 
                  validate hypotheses, and measure success.
                </p>
                <p className="text-gray-700 mb-4">
                  Consider this scenario: You're deciding whether to expand your product line. A gut-feeling approach 
                  might rely on personal preference or competitor copying. A data-driven approach analyzes customer 
                  purchase patterns, market demand, profit margins, and resource requirements to make an informed choice.
                </p>
                <p className="text-gray-700">
                  The beauty of data-driven decisions is that they're measurable and adjustable. When you base decisions 
                  on data, you can track outcomes, learn from results, and continuously improve your strategy.
                </p>
              </section>
              
              <section className="mb-10">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
                  <Target className="w-6 h-6 text-primary" />
                  The 5-Step Framework for Data-Driven Decisions
                </h2>
                
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                      Define Clear Questions
                    </h3>
                    <p className="text-gray-700 mb-3">
                      Start with specific, answerable questions. Instead of "How can we grow?", ask "Which customer 
                      segment has the highest lifetime value?" or "What's our customer acquisition cost by channel?"
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <strong>Example:</strong> "Should we open on Sundays?" becomes "What percentage of our weekly 
                        revenue occurs on weekends, and what would be the operational cost of Sunday hours?"
                      </p>
                    </div>
                  </Card>
                  
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                      Collect Relevant Data
                    </h3>
                    <p className="text-gray-700 mb-3">
                      Identify what data you need and where to find it. This might include sales records, customer 
                      feedback, website analytics, inventory levels, or market research. Quality matters more than quantity.
                    </p>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span>Internal data: Sales, costs, customer behavior</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span>External data: Market trends, competitor pricing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span>Customer data: Feedback, reviews, support tickets</span>
                      </li>
                    </ul>
                  </Card>
                  
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                      Analyze and Find Patterns
                    </h3>
                    <p className="text-gray-700 mb-3">
                      Look for trends, correlations, and insights in your data. This is where tools like AskEuno excel — 
                      turning raw data into understandable patterns without requiring technical expertise.
                    </p>
                    <p className="text-gray-700">
                      Key analyses include trend analysis (are sales growing?), segmentation (which customers are most 
                      profitable?), and correlation (does weather affect foot traffic?).
                    </p>
                  </Card>
                  
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                      Make the Decision
                    </h3>
                    <p className="text-gray-700 mb-3">
                      Use your analysis to inform your choice. Data shouldn't make decisions for you — it should give 
                      you the confidence to make better decisions. Consider the data alongside other factors like 
                      company values and long-term strategy.
                    </p>
                    <p className="text-gray-700">
                      Document your decision rationale, including what data influenced it and what assumptions you're 
                      making. This creates accountability and helps you learn from outcomes.
                    </p>
                  </Card>
                  
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
                      Measure and Adjust
                    </h3>
                    <p className="text-gray-700 mb-3">
                      Track the results of your decision against your expectations. Did the change achieve its goal? 
                      What unexpected outcomes occurred? Use these insights to refine your approach.
                    </p>
                    <p className="text-gray-700">
                      Set up KPIs (Key Performance Indicators) before implementing changes, so you know exactly what 
                      success looks like and can measure progress objectively.
                    </p>
                  </Card>
                </div>
              </section>
              
              <section className="mb-10">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
                  <Lightbulb className="w-6 h-6 text-primary" />
                  Real-World Examples of Data-Driven Wins
                </h2>
                
                <div className="space-y-6">
                  <Card className="p-6 border-l-4 border-primary">
                    <h3 className="font-semibold text-gray-900 mb-2">Inventory Optimization</h3>
                    <p className="text-gray-700 mb-3">
                      A boutique retailer analyzed 12 months of sales data and discovered that 20% of their inventory 
                      generated 80% of revenue. By focusing on high-performers and reducing slow-moving stock, they 
                      increased profit margins by 35% while reducing storage costs.
                    </p>
                    <p className="text-sm text-gray-600 italic">
                      Key insight: Data revealed that "variety" was less important to customers than having popular 
                      items consistently in stock.
                    </p>
                  </Card>
                  
                  <Card className="p-6 border-l-4 border-primary">
                    <h3 className="font-semibold text-gray-900 mb-2">Marketing Channel ROI</h3>
                    <p className="text-gray-700 mb-3">
                      An e-commerce business tracked customer acquisition costs across email, social media, and paid 
                      search. They found email marketing produced 3x the ROI of paid ads. Reallocating budget to email 
                      campaigns increased overall revenue by 40% without increasing marketing spend.
                    </p>
                    <p className="text-sm text-gray-600 italic">
                      Key insight: The "unsexy" email channel was their most profitable growth driver.
                    </p>
                  </Card>
                  
                  <Card className="p-6 border-l-4 border-primary">
                    <h3 className="font-semibold text-gray-900 mb-2">Pricing Strategy</h3>
                    <p className="text-gray-700 mb-3">
                      A SaaS company analyzed user behavior and found that customers who used three specific features 
                      had 90% retention rates. They created a premium tier highlighting these features and increased 
                      average revenue per user by 25%.
                    </p>
                    <p className="text-sm text-gray-600 italic">
                      Key insight: Value-based pricing aligned with actual usage patterns beats competitor-based pricing.
                    </p>
                  </Card>
                </div>
              </section>
              
              <section className="mb-10">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-primary" />
                  Common Pitfalls to Avoid
                </h2>
                
                <div className="space-y-4">
                  <Card className="p-4 bg-red-50 border-red-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Analysis Paralysis</h3>
                    <p className="text-gray-700 text-sm">
                      Don't wait for perfect data. Start with what you have, make decisions, and improve your data 
                      collection over time. Progress beats perfection.
                    </p>
                  </Card>
                  
                  <Card className="p-4 bg-red-50 border-red-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Correlation vs. Causation</h3>
                    <p className="text-gray-700 text-sm">
                      Just because two things happen together doesn't mean one causes the other. Ice cream sales and 
                      sunburn rates both increase in summer, but ice cream doesn't cause sunburn.
                    </p>
                  </Card>
                  
                  <Card className="p-4 bg-red-50 border-red-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Ignoring Context</h3>
                    <p className="text-gray-700 text-sm">
                      Data needs context to be meaningful. A 10% sales drop might be concerning — unless it's January 
                      after a December holiday rush, in which case it's expected.
                    </p>
                  </Card>
                  
                  <Card className="p-4 bg-red-50 border-red-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Confirmation Bias</h3>
                    <p className="text-gray-700 text-sm">
                      Don't cherry-pick data that supports what you already believe. Look at all relevant data, 
                      especially information that challenges your assumptions.
                    </p>
                  </Card>
                </div>
              </section>
              
              <section className="mb-10">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Getting Started: Your First Data-Driven Decision
                </h2>
                <p className="text-gray-700 mb-4">
                  Ready to implement data-driven decision making? Start small with a single, specific decision. 
                  Here's a practical first project:
                </p>
                
                <Card className="p-6 bg-gray-50">
                  <h3 className="font-semibold text-gray-900 mb-3">Quick Start Project: Optimize Your Best Sellers</h3>
                  <ol className="space-y-3 text-gray-700">
                    <li className="flex gap-3">
                      <span className="font-semibold">1.</span>
                      <span>Pull your sales data for the last 90 days</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold">2.</span>
                      <span>Identify your top 10 products by revenue</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold">3.</span>
                      <span>Calculate the profit margin for each</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold">4.</span>
                      <span>Check inventory levels and reorder points</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold">5.</span>
                      <span>Make one improvement: adjust pricing, increase inventory, or boost marketing for 
                      high-margin winners</span>
                    </li>
                  </ol>
                  <p className="text-gray-600 mt-4 text-sm">
                    This simple analysis often reveals surprising opportunities — like a high-margin product that's 
                    frequently out of stock, costing you easy profits.
                  </p>
                </Card>
              </section>
              
              {/* CTA Section */}
              <Card className="p-8 bg-gradient-to-br from-primary/10 to-primary/20 border-primary/30 mb-10">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Make Your First Data-Driven Decision Today
                  </h3>
                  <p className="text-gray-700 mb-6">
                    AskEuno makes data analysis simple. Connect your business data and start getting actionable 
                    insights in minutes, not months. No technical skills required.
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
                      How much data do I need to start making data-driven decisions?
                    </h3>
                    <p className="text-gray-700">
                      You can start with as little as 30 days of data, though 90 days gives better insights. The key 
                      is consistency — regular data collection is more valuable than volume. Even basic sales records 
                      and customer information can reveal actionable patterns.
                    </p>
                  </Card>
                  
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      What if I don't have technical skills or a data analyst?
                    </h3>
                    <p className="text-gray-700">
                      That's exactly why tools like AskEuno exist. We translate your business questions into data 
                      analysis automatically. You ask questions in plain English, and get visual answers without 
                      needing to understand databases, SQL, or statistics.
                    </p>
                  </Card>
                  
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Should data replace intuition completely?
                    </h3>
                    <p className="text-gray-700">
                      No — the best decisions combine data insights with business experience and intuition. Data tells 
                      you what's happening and suggests why, but your industry knowledge and customer understanding 
                      provide crucial context that pure numbers can't capture.
                    </p>
                  </Card>
                </div>
              </section>
              
              {/* Related Resources */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Continue Learning</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Link href="/resources/sql-for-small-business">
                    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        What Is SQL and Why Small Businesses Need It
                      </h3>
                      <p className="text-sm text-gray-600">
                        Understand the technology behind data analysis and how AskEuno makes it accessible.
                      </p>
                    </Card>
                  </Link>
                  
                  <Link href="/resources/business-analytics-guide">
                    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Business Analytics 101
                      </h3>
                      <p className="text-sm text-gray-600">
                        Deep dive into analytics concepts and advanced strategies for growth.
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