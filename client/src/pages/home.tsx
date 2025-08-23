import { Check, Zap, Lock, MessageCircle, ArrowRight, TrendingUp, BarChart, Target, Lightbulb, ChartLine } from 'lucide-react';
import DemoAnimation from '@/components/DemoAnimation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link, useLocation } from 'wouter';
import PricingSection from '@/components/PricingSection';
import EunoLogo from '@/components/EunoLogo';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Authenticated user view - show welcome page with workflow links
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        
        <div className="flex-1 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 -z-10" />
          
          {/* Hero Section */}
          <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                Welcome back to Euno, {user?.username}!
              </h1>
              <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
                Your business data, simplified. Insights in a chat. 
                Let's continue making sense of your data together.
              </p>
              
              <Link href="/chat">
                <Button size="lg" className="px-8 py-6 text-lg">
                  Start Chatting
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </section>

          {/* How Euno Works Section */}
          <section className="py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">How Euno Works</h2>
                <p className="text-lg text-gray-600">Three simple steps to unlock your data insights</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                <Card className="p-8 text-center hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Connect Your Data</h3>
                  <p className="text-gray-600 mb-4">
                    Upload files or connect to live data sources. We support Excel, CSV, databases, and popular business apps.
                  </p>
                  <Link href="/connections">
                    <Button variant="outline" size="sm">
                      View Connections
                    </Button>
                  </Link>
                </Card>
                
                <Card className="p-8 text-center hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Chat with Euno</h3>
                  <p className="text-gray-600 mb-4">
                    Ask questions in plain English. Euno understands your business context and provides clear answers.
                  </p>
                  <Link href="/chat">
                    <Button variant="outline" size="sm">
                      Start Chatting
                    </Button>
                  </Link>
                </Card>
                
                <Card className="p-8 text-center hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Get Clear Insights</h3>
                  <p className="text-gray-600 mb-4">
                    Receive instant answers, trends, and recommendations. Make better decisions with AI-powered analysis.
                  </p>
                  <Link href="/dashboards">
                    <Button variant="outline" size="sm">
                      View Dashboards
                    </Button>
                  </Link>
                </Card>
              </div>
            </div>
          </section>
        </div>

        <Footer />
      </div>
    );
  }

  // Unauthenticated user view - show marketing landing page
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
                <EunoLogo className="w-8 h-8" />
                <span className="text-xl font-bold text-gray-900">Euno</span>
              </div>
            </Link>
            <nav className="hidden md:flex items-center space-x-4">
              <a href="#benefits" className="text-gray-600 hover:text-primary transition-colors">
                Benefits
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-primary transition-colors">
                Pricing
              </a>
              <Button variant="ghost" className="text-gray-600 hover:text-primary" onClick={() => setLocation('/signin')}>
                Login
              </Button>
              <Button onClick={() => setLocation('/signin')}>
                Get Started For Free
              </Button>
            </nav>
            
            {/* Mobile menu */}
            <div className="md:hidden flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setLocation('/signin')}>
                Login
              </Button>
              <Button size="sm" onClick={() => setLocation('/signin')}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 -z-10" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Headline and CTA */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Your instant data analyst.<br/>
                Ask anything.<br/>
                <span className="text-primary">Get answers.</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Euno makes your business data actually make sense — without needing a data team.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  size="lg"
                  className="px-8 py-6 text-lg"
                  onClick={() => setLocation('/signin')}
                >
                  Get Started For Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
              
              <p className="text-sm text-gray-500 mt-4">
                No credit card required • Free trial for all plans
              </p>
            </div>
            
            {/* Right side - Demo Video/Animation */}
            <div className="relative">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-2xl overflow-hidden">
                <div className="aspect-video">
                  <DemoAnimation />
                </div>
              </div>
              <p className="text-center text-sm text-gray-600 mt-3 flex items-center justify-center">
                <span className="inline-block w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-2">
                  <ArrowRight className="w-4 h-4 text-primary" />
                </span>
                See Euno in action
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Why Your Business Needs Data Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Why Your Business Needs Data
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transform guesswork into strategy. Join the businesses that thrive on insights.
            </p>
            <div className="mt-6">
              <Link href="/cost-of-bad-query">
                <Button variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-white">
                  Learn the Cost of a Bad Query
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Main content blocks */}
          <div className="space-y-16">
            {/* Block 1: Most businesses guess */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  Most businesses <span className="text-primary">guess</span>. 
                  <br />Winning businesses <span className="text-primary">know</span>.
                </h3>
                <p className="text-lg text-gray-600">
                  Data turns instincts into insights. It reveals your best customers, 
                  most profitable products, busiest hours, and what's holding you back.
                </p>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                  <BarChart className="w-48 h-48 text-primary relative z-10" />
                </div>
              </div>
            </div>

            {/* Block 2: Data shows what to do next */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-8">
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  Data doesn't just tell you what happened—<br />
                  it shows you <span className="text-primary">what to do next</span>.
                </h3>
                <div className="space-y-2 text-lg text-gray-600">
                  <p className="flex items-center justify-center md:justify-start">
                    <ArrowRight className="w-5 h-5 text-primary mr-2" />
                    Want to grow? Find patterns.
                  </p>
                  <p className="flex items-center justify-center md:justify-start">
                    <ArrowRight className="w-5 h-5 text-primary mr-2" />
                    Want to save time? Spot waste.
                  </p>
                  <p className="flex items-center justify-center md:justify-start">
                    <ArrowRight className="w-5 h-5 text-primary mr-2" />
                    Want to sell more? Learn what works.
                  </p>
                </div>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                  <Lightbulb className="w-48 h-48 text-primary relative z-10" />
                </div>
              </div>
            </div>

            {/* Block 3: Imagine seeing exactly why */}
            <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-8 md:p-12 text-center">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 max-w-3xl mx-auto">
                Imagine seeing exactly why your sales spike… or drop… 
                <br />and knowing <span className="text-primary">exactly what to do about it</span>.
              </h3>
              <p className="text-xl text-gray-600 mb-2">
                That's the power of data.
              </p>
              <p className="text-xl text-gray-600 mb-8">
                And with Euno, it's not just for big companies anymore.
              </p>
            </div>

            
          </div>
        </div>
      </section>
      {/* Benefits Section */}
      <section id="benefits" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why businesses choose Euno</h2>
            <p className="text-xl text-gray-600">Simple, powerful, and built for your success</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect your data — live or manual</h3>
                  <p className="text-gray-600">
                    Upload Excel files, CSVs, or connect directly to your databases and business apps. 
                    Real-time sync keeps everything current.
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant AI answers</h3>
                  <p className="text-gray-600">
                    Ask questions in plain English. Get clear answers in seconds. 
                    No SQL queries or complex filters needed.
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure, private space</h3>
                  <p className="text-gray-600">
                    Your data is encrypted and isolated. We never share or sell your information. 
                    Strong security for every user.
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Check className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Start free for 7 days</h3>
                  <p className="text-gray-600">
                    Try Euno risk-free for 7 days. 
                    Cancel anytime during your trial.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
      <PricingSection />
      <Footer />
    </div>
  );
}