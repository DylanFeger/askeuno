import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import EunoLogo from '@/components/EunoLogo';
import Footer from '@/components/Footer';

export default function Culture() {
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
            <span className="text-primary">Hypanocalothanocoly</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            More than a silly word - it's our culture
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-12">
            <div className="prose prose-lg max-w-none">
              <p className="text-lg text-gray-700 mb-6">
                Hypanocalothanocoly isn't just a word that Carter gave us - it's the spirit that defines how we work, how we think, and how we build.
              </p>
              
              <p className="text-lg text-gray-700 mb-6">
                It represents the curiosity that drives us to ask "what if?" and "why not?" It's the good spirits that keep us going when the code won't compile at 2 AM. It's the joy of discovery when we finally crack a problem that seemed impossible.
              </p>
              
              <p className="text-lg text-gray-700 mb-6">
                This culture means we don't just build tools - we build them with purpose. We believe that data shouldn't be intimidating. Business insights shouldn't require a PhD. And every small business owner deserves the same powerful analytics that big corporations have.
              </p>
              
              <p className="text-lg text-gray-700 mb-6">
                Hypanocalothanocoly reminds us to stay humble, stay curious, and never forget that we're just a group of boys from the farm who decided to build something meaningful. It's about keeping that barefoot, shirtless spirit of freedom and creativity, even as we tackle complex data problems.
              </p>
              
              <p className="text-lg text-gray-700">
                So yes, it might sound like a silly word. But to us, it's everything. It's why we get up in the morning. It's why we care about every line of code, every user interaction, and every business we help grow.
              </p>
              
              <p className="text-lg text-gray-700 mt-8 font-semibold text-center text-primary">
                That's Hypanocalothanocoly. That's who we are.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Experience Our Culture?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join us in making data simple, accessible, and meaningful for every business.
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