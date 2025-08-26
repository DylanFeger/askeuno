import { useEffect } from 'react';
import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Shield, Sparkles, Cpu, Eye, MessageSquare, CheckCircle, ArrowUp } from 'lucide-react';

export default function ResponsibleAI() {
  useEffect(() => {
    // SEO meta tags
    document.title = 'Responsible AI - Ethical Data Intelligence | Euno';
    
    // Meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Learn how Euno practices responsible AI with personalized, innovative, embedded, accessible, honest, and thoroughly tested data intelligence solutions for small businesses.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Learn how Euno practices responsible AI with personalized, innovative, embedded, accessible, honest, and thoroughly tested data intelligence solutions for small businesses.';
      document.head.appendChild(meta);
    }

    // OpenGraph tags
    const ogTags = [
      { property: 'og:title', content: 'Responsible AI - Ethical Data Intelligence | Euno' },
      { property: 'og:description', content: 'Discover how Euno implements responsible AI practices to deliver trustworthy, accessible, and innovative business intelligence.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: window.location.href }
    ];

    ogTags.forEach(tag => {
      let element = document.querySelector(`meta[property="${tag.property}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('property', tag.property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', tag.content);
    });
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const sections = [
    { id: 'personalized', label: 'Personalized', icon: Shield },
    { id: 'innovative', label: 'Innovative', icon: Sparkles },
    { id: 'embedded', label: 'Embedded', icon: Cpu },
    { id: 'accessible', label: 'Accessible', icon: Eye },
    { id: 'honest', label: 'Honest', icon: MessageSquare },
    { id: 'tested', label: 'Tested', icon: CheckCircle }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Sticky Navigation */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <h1 className="text-lg font-semibold text-gray-900">Responsible AI</h1>
            <div className="hidden md:flex items-center space-x-6">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="text-sm text-gray-600 hover:text-primary transition-colors"
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Responsible AI at Euno
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              We believe AI should empower businesses ethically, transparently, and accessibly. 
              Our commitment to responsible AI ensures your data insights are trustworthy and fair.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{section.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <div className="container mx-auto px-4 pb-20">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Personalized AI */}
          <Card id="personalized" className="p-8">
            <div className="flex items-start space-x-4">
              <Shield className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Personalized AI</h2>
                <p className="text-gray-600 mb-4">
                  Your business is unique, and your AI insights should be too. Euno tailors analysis to your specific industry, 
                  data patterns, and business goals while giving you full control over personalization settings.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Context-aware insights based on your business type and history</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Adjustable AI personality from concise to detailed responses</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Privacy-first approach with no data sharing between accounts</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Innovative AI */}
          <Card id="innovative" className="p-8">
            <div className="flex items-start space-x-4">
              <Sparkles className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Innovative AI</h2>
                <p className="text-gray-600 mb-4">
                  We push boundaries responsibly. New AI capabilities are tested thoroughly and introduced as opt-in features, 
                  letting you choose when to adopt cutting-edge analysis methods.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Metaphorical intelligence for natural conversation</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Predictive analytics with clear accuracy indicators</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Beta features clearly marked with opt-in participation</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Embedded AI */}
          <Card id="embedded" className="p-8">
            <div className="flex items-start space-x-4">
              <Cpu className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Embedded AI</h2>
                <p className="text-gray-600 mb-4">
                  AI isn't an afterthought at Euno—it's woven into every workflow. From data upload to insight generation, 
                  AI enhances your experience without getting in the way.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Automatic schema detection during data import</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Smart data quality checks and recommendations</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Proactive insights without requiring complex queries</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Accessible AI */}
          <Card id="accessible" className="p-8">
            <div className="flex items-start space-x-4">
              <Eye className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Accessible AI</h2>
                <p className="text-gray-600 mb-4">
                  Business intelligence shouldn't require a data science degree. We use plain language, 
                  intuitive interfaces, and inclusive design to make AI insights available to everyone.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Natural language queries without SQL knowledge</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Keyboard-friendly navigation throughout the platform</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>High contrast visuals and readable font sizes</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Honest AI */}
          <Card id="honest" className="p-8">
            <div className="flex items-start space-x-4">
              <MessageSquare className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Honest AI</h2>
                <p className="text-gray-600 mb-4">
                  We're transparent about what our AI can and can't do. Every insight shows confidence levels, 
                  data sources, and limitations so you can make informed decisions.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Confidence scores displayed with every analysis</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Clear explanations when data is insufficient</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>No fabricated data—only insights from your actual information</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Tested */}
          <Card id="tested" className="p-8">
            <div className="flex items-start space-x-4">
              <CheckCircle className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Thoroughly Tested</h2>
                <p className="text-gray-600 mb-4">
                  Quality isn't optional. Every AI feature undergoes rigorous testing, red-team security checks, 
                  and continuous evaluation to ensure reliable, safe performance.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Comprehensive QA testing before each release</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Red-team security assessments for data protection</span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Performance metrics tracked and optimized continuously</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Footer Section */}
          <div className="text-center py-12 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-6">Last updated: August 26, 2025</p>
            <div className="space-y-4">
              <p className="text-gray-600">
                Have questions about our responsible AI practices?
              </p>
              <Link href="/contact">
                <Button size="lg">
                  Contact Our Team
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Back to Top */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 p-3 bg-primary text-white rounded-full shadow-lg hover:shadow-xl transition-shadow md:hidden"
            aria-label="Back to top"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}