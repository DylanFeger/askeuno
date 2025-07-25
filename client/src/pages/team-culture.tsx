import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";

export default function TeamCulture() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-8 text-center">
              The Culture of Hypanocalothanocoly
            </h1>
            
            {/* Definition Section */}
            <Card className="p-8 bg-gray-50 border-gray-200 mb-16">
              <div className="space-y-4 text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Hypanocalothanocoly
                </h2>
                <p className="text-sm text-gray-500 italic">
                  (noun) hy·pa·no·cal·lo·than·oc·o·ly
                </p>
                <div className="prose prose-lg mx-auto text-gray-700">
                  <p>The highly-desired state of being, where everything feels like it's going right instead of wrong.</p>
                  <p>Where purpose shapes the work we do, and growth feels honest, earned, and true.</p>
                  <p>Where outcomes match our best-intent. Not luck, but care, and effort spent. It's not perfection, not pretend — But vision, trust, and hearts that mend.</p>
                  <p>When people move with hearts and hands aligned, leadership's the cause, not the end we find.</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Philosophy Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
              The Hypanocalothanocoly Leadership Philosophy
            </h2>
            
            <div className="space-y-12">
              {/* Principle 1 */}
              <Card className="p-8 bg-white border-gray-200">
                <h3 className="text-xl font-bold text-primary mb-4">
                  1. Leadership Is Teaching Through Listening, Not Telling
                </h3>
                <div className="space-y-3 text-gray-700">
                  <p>Leadership begins with listening.</p>
                  <p>Teaching starts when you hear what people understand and misunderstand.</p>
                  <p>Great leaders don't lecture—they guide.</p>
                  <p>Create space for others to discover rather than comply.</p>
                </div>
              </Card>

              {/* Principle 2 */}
              <Card className="p-8 bg-white border-gray-200">
                <h3 className="text-xl font-bold text-primary mb-4">
                  2. Leaders Clarify Objectives Relentlessly—Then Get Out of the Way
                </h3>
                <div className="space-y-3 text-gray-700">
                  <p>Clarity is kindness.</p>
                  <p>Make the objective clear, check for understanding.</p>
                  <p>Help shape the frame early, then step back.</p>
                  <p>Don't disrupt progress with late-breaking goals.</p>
                </div>
              </Card>

              {/* Principle 3 */}
              <Card className="p-8 bg-white border-gray-200">
                <h3 className="text-xl font-bold text-primary mb-4">
                  3. Meet People Where They Are—Then Grow Them
                </h3>
                <div className="space-y-3 text-gray-700">
                  <p>Junior teammates need manageable objectives. That's a starting point, not a flaw.</p>
                  <p>Break work into small steps.</p>
                  <p>Encourage ownership of direction.</p>
                  <p>Let seniors thrive in ambiguity.</p>
                  <p>Growth requires truth and honesty.</p>
                  <p>Help someone find a better fit—or help the team by letting them go.</p>
                </div>
              </Card>

              {/* Principle 4 */}
              <Card className="p-8 bg-white border-gray-200">
                <h3 className="text-xl font-bold text-primary mb-4">
                  4. Replace Correction With Curiosity
                </h3>
                <div className="space-y-3 text-gray-700">
                  <p>Be slow to judge. Fast to ask:</p>
                  <div className="pl-6 space-y-2 italic">
                    <p>"Can you walk me through your thinking?"</p>
                    <p>"What outcome were you aiming for?"</p>
                    <p>"Where did you feel unclear?"</p>
                  </div>
                  <p className="pt-4">
                    Curiosity leads to dialogue → understanding → alignment → Hypanocalothanocoly.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}