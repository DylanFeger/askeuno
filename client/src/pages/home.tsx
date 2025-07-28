import { Check, Zap, Lock, MessageCircle, ArrowRight, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link, useLocation } from 'wouter';
import PricingSection from '@/components/PricingSection';
import AuthForm from '@/components/AuthForm';
import HyppoLogo from '@/components/HyppoLogo';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const handleAuthSuccess = () => {
    // Redirect to chat after successful auth
    queryClient.invalidateQueries();
    setLocation('/chat');
  };

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
                Your business data, simplified — insights in a chat. 
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
                <HyppoLogo className="w-8 h-8" />
                <span className="text-xl font-bold text-gray-900">Euno</span>
              </div>
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#benefits" className="text-gray-600 hover:text-primary transition-colors">
                Benefits
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-primary transition-colors">
                Pricing
              </a>
              <Button onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}>
                Start Free Trial
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 -z-10" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Your business data, simplified — <br/>
            <span className="text-primary">insights in a chat</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Upload or connect your data — Euno handles the rest with secure, smart answers in seconds. 
            No complex dashboards. Just clear insights when you need them.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="px-8 py-6 text-lg"
              onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Start Free for 30 Days
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • Free trial for all plans
          </p>
        </div>
      </section>

      {/* No Data CTA Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Don't have data yet? Start tracking now
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                No spreadsheets? No problem. We'll help you set up simple tracking for your business in minutes.
              </p>
              <Link href="/start-tracking">
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                  Start Tracking Your Data
                  <TrendingUp className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Auth Section */}
      <section id="auth-section" className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Ready to simplify your data?</h2>
            <p className="text-lg text-gray-600">Sign up or sign in to unlock Euno's full experience</p>
          </div>
          <AuthForm onSuccess={handleAuthSuccess} />
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Start free for 30 days</h3>
                  <p className="text-gray-600">
                    Try Euno risk-free. No credit card required. 
                    Choose the plan that fits your business when you're ready.
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