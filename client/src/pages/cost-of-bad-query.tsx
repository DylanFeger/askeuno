import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import EunoLogo from '@/components/EunoLogo';
import Footer from '@/components/Footer';
import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

export default function CostOfBadQuery() {
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
            <Link href="/signin">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-12 text-center">
            The Cost of a Bad Query
          </h1>

          {/* Body Content */}
          <div className="space-y-12">
            {/* Section 1 */}
            <div className="bg-red-50 border-l-4 border-red-500 p-8 rounded-r-lg">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    1. A bad or inaccurate database query can mislead a business.
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    When data is pulled incorrectly, the numbers tell the wrong story. Even a small error in a query can completely distort the truth. Instead of clarity, you get noise—and that noise can send your business in the wrong direction.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="bg-orange-50 border-l-4 border-orange-500 p-8 rounded-r-lg">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    2. Acting on wrong data can lead to poor decisions, wasted money, missed opportunities, and damaged customer trust.
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    Bad queries don't just stay in the database. They ripple outward. A wrong marketing strategy, a poorly priced product, or an inefficient investment can all start with inaccurate information. Mistakes cost time, money, and reputation.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="bg-gray-50 border-l-4 border-gray-400 p-8 rounded-r-lg">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-gray-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    3. Many business owners hesitate to hire data analysts because they fear being given unreliable or confusing results.
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    It's a valid concern. Business owners don't want numbers they can't trust. Hiring the wrong analyst or relying on weak reporting can feel riskier than doing nothing at all.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4 - Solution */}
            <div className="bg-primary/5 border-l-4 border-primary p-8 rounded-r-lg">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    4. Ask Euno solves this problem by ensuring queries are accurate, insights are clear, and business owners always understand the "why" behind the numbers.
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    Euno was built to remove that fear. Every query is designed to be precise, every answer comes with context, and every insight is easy to understand. No confusion. No wasted effort. Just reliable guidance for smarter decisions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Closing Statement */}
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-8 rounded-2xl">
              <p className="text-xl font-semibold text-gray-900 mb-6">
                Good data leads to good decisions. Ask Euno makes sure you never settle for less.
              </p>
              <Link href="/signin">
                <Button size="lg" className="px-8">
                  Start Getting Accurate Insights
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}