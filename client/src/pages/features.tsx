import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import EunoLogo from '@/components/EunoLogo';
import Footer from '@/components/Footer';
import teamPhoto1 from '@assets/158085F3-5AB3-4BA2-B873-5406AD185492_1_105_c_1756074643217.jpeg';
import teamPhoto2 from '@assets/505E49C6-CE66-4BB9-8E96-652EACC49A90_1_105_c_1756074686062.jpeg';

export default function Features() {
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
            <Link href="/">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Our Team
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Established and built on a farm by us shirtless barefoot boys
          </p>
        </div>
      </section>

      {/* Team Photos Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="overflow-hidden">
              <img 
                src={teamPhoto1} 
                alt="Team on the farm" 
                className="w-full h-full object-cover"
              />
            </Card>
            <Card className="overflow-hidden">
              <img 
                src={teamPhoto2} 
                alt="Team on the farm" 
                className="w-full h-full object-cover"
              />
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Data?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of businesses making smarter decisions with Euno.
          </p>
          <Link href="/">
            <Button size="lg" className="px-8">
              Start Your Free Trial
            </Button>
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            7-day free trial
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}