import { useState, useEffect } from 'react';
import { Upload, MessageCircle, BarChart3, FileSpreadsheet } from 'lucide-react';
import GlassesIcon from './GlassesIcon';

export default function DemoAnimation() {
  const [currentStep, setCurrentStep] = useState(0);
  const [typedText, setTypedText] = useState('');
  
  const question = "What were our best sellers last month?";
  
  useEffect(() => {
    const steps = [
      { duration: 2000 }, // Step 0: Show data connection
      { duration: 1500 }, // Step 1: Open chat
      { duration: 2500 }, // Step 2: Type question
      { duration: 2000 }, // Step 3: Show answer
      { duration: 1500 }, // Step 4: Pause before restart
    ];
    
    let timeout: NodeJS.Timeout;
    
    if (currentStep === 2) {
      // Typing animation
      let charIndex = 0;
      const typeInterval = setInterval(() => {
        if (charIndex <= question.length) {
          setTypedText(question.substring(0, charIndex));
          charIndex++;
        } else {
          clearInterval(typeInterval);
        }
      }, 60);
      
      timeout = setTimeout(() => {
        setCurrentStep((prev) => (prev + 1) % steps.length);
      }, steps[currentStep].duration);
      
      return () => {
        clearInterval(typeInterval);
        clearTimeout(timeout);
      };
    } else {
      timeout = setTimeout(() => {
        setCurrentStep((prev) => (prev + 1) % steps.length);
        if (currentStep === 4) {
          setTypedText('');
        }
      }, steps[currentStep].duration);
      
      return () => clearTimeout(timeout);
    }
  }, [currentStep]);
  
  return (
    <div className="bg-white rounded-xl shadow-inner h-full flex flex-col">
      {/* Step 0 & 1: Data Connection UI */}
      <div className={`transition-all duration-500 ${currentStep >= 1 ? 'h-0 opacity-0 overflow-hidden' : 'flex-1'}`}>
        <div className="p-8 flex flex-col items-center justify-center h-full">
          <div className="mb-6">
            <FileSpreadsheet className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 text-center">Connect Your Data</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 w-full max-w-md">
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              <Upload className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">CSV</p>
            </div>
            <div className="bg-primary/10 rounded-lg p-4 text-center border-2 border-primary">
              <FileSpreadsheet className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-primary font-semibold">Excel</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              <MessageCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">API</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Steps 1-4: Chat Interface */}
      <div className={`transition-all duration-500 ${currentStep >= 1 ? 'flex-1' : 'h-0 opacity-0'} flex flex-col`}>
        <div className="border-b bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-900">Chat with Euno</h3>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Welcome message */}
          <div className={`transition-all duration-300 ${currentStep >= 1 ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <GlassesIcon className="w-6 h-6 text-white" />
              </div>
              <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                <p className="text-sm text-gray-700">
                  Hello! I'm Euno. I can help you understand your business data. What would you like to know?
                </p>
              </div>
            </div>
          </div>
          
          {/* User question */}
          {currentStep >= 2 && (
            <div className="flex items-start gap-3 mb-4 justify-end">
              <div className="bg-primary text-white rounded-lg p-3 max-w-xs">
                <p className="text-sm">{typedText}</p>
              </div>
            </div>
          )}
          
          {/* Euno's response */}
          {currentStep >= 3 && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <GlassesIcon className="w-6 h-6 text-white" />
              </div>
              <div className="bg-gray-100 rounded-lg p-3 max-w-sm">
                <p className="text-sm text-gray-700 mb-3">
                  Based on your sales data, here are your top 3 best sellers last month:
                </p>
                <div className="bg-white rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Widget Pro</span>
                    <span className="text-sm text-primary">$24,580</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Smart Device X</span>
                    <span className="text-sm text-primary">$18,320</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Premium Kit</span>
                    <span className="text-sm text-primary">$15,890</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500">View detailed report</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Input field */}
        {currentStep >= 1 && (
          <div className="border-t p-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={currentStep === 2 ? typedText : ''}
                readOnly
                placeholder="Ask Euno anything..."
                className="flex-1 px-4 py-2 border rounded-lg bg-gray-50 text-sm"
              />
              <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}