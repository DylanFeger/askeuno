import { useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, Database, Cloud, Link, Mail, Calendar, 
  ArrowRight, ArrowLeft, CheckCircle, HelpCircle,
  FileSpreadsheet, ShoppingCart, Building2, BarChart3, Server
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const importMethods = [
  {
    id: 'upload',
    title: 'Upload Files',
    description: 'Drag & drop CSV, Excel, or JSON files',
    icon: Upload,
    color: 'text-blue-500',
  },
  {
    id: 'database',
    title: 'Connect Database',
    description: 'MySQL, PostgreSQL, or MongoDB',
    icon: Database,
    color: 'text-green-500',
  },
  {
    id: 'cloud',
    title: 'Cloud Storage',
    description: 'Google Sheets, AWS S3',
    icon: Cloud,
    color: 'text-purple-500',
  },
  {
    id: 'api',
    title: 'API Integration',
    description: 'Shopify, Stripe, custom APIs',
    icon: Link,
    color: 'text-orange-500',
  },

];

export default function ImportWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [formData, setFormData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep === 1 && !selectedMethod) {
      toast({
        title: 'Please select an import method',
        variant: 'destructive',
      });
      return;
    }
    setCurrentStep(Math.min(currentStep + 1, totalSteps));
  };

  const handleBack = () => {
    setCurrentStep(Math.max(currentStep - 1, 1));
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    // Simulate completion
    setTimeout(() => {
      toast({
        title: 'Import configured successfully!',
        description: 'Your data will be available in the chat shortly.',
      });
      setLocation('/chat');
    }, 1500);
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Choose Your Import Method</h2>
        <p className="text-gray-600 mb-6">Select how you'd like to bring your data into Euno</p>
      </div>
      
      <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {importMethods.map((method) => {
            const Icon = method.icon;
            return (
              <label
                key={method.id}
                htmlFor={method.id}
                className={`relative flex cursor-pointer rounded-lg border p-4 hover:bg-gray-50 ${
                  selectedMethod === method.id ? 'border-primary bg-primary/5' : 'border-gray-200'
                }`}
              >
                <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                <div className="flex items-start space-x-3">
                  <Icon className={`h-6 w-6 mt-1 ${method.color}`} />
                  <div className="flex-1">
                    <div className="font-medium">{method.title}</div>
                    <div className="text-sm text-gray-600">{method.description}</div>
                  </div>
                </div>
                {selectedMethod === method.id && (
                  <CheckCircle className="absolute top-4 right-4 h-5 w-5 text-primary" />
                )}
              </label>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );

  const renderStep2 = () => {
    switch (selectedMethod) {
      case 'upload':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-2">Upload Your Files</h2>
            <Alert>
              <HelpCircle className="h-4 w-4" />
              <AlertDescription>
                Supported formats: CSV, Excel (.xlsx, .xls), JSON. Maximum file size: 500MB.
              </AlertDescription>
            </Alert>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg mb-2">Drag & drop your files here</p>
              <p className="text-sm text-gray-600 mb-4">or</p>
              <Button onClick={() => setLocation('/upload')}>Browse Files</Button>
            </div>
          </div>
        );

      case 'database':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-2">Database Connection</h2>
            <div>
              <Label>Database Type</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, dbType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select database type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="mongodb">MongoDB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Host</Label>
              <Input placeholder="database.example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Port</Label>
                <Input placeholder="3306" />
              </div>
              <div>
                <Label>Database Name</Label>
                <Input placeholder="my_database" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Username</Label>
                <Input placeholder="db_user" />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-2">API Integration</h2>
            <div>
              <Label>Select Service</Label>
              <RadioGroup onValueChange={(value) => setFormData({ ...formData, apiType: value })}>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="shopify" />
                    <ShoppingCart className="h-4 w-4" />
                    <span>Shopify</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="stripe" />
                    <Building2 className="h-4 w-4" />
                    <span>Stripe</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="custom" />
                    <Server className="h-4 w-4" />
                    <span>Custom API</span>
                  </label>
                </div>
              </RadioGroup>
            </div>
            {formData.apiType && (
              <div className="space-y-4 mt-4">
                <div>
                  <Label>API Key</Label>
                  <Input type="password" placeholder="Your API key" />
                </div>
                {formData.apiType === 'shopify' && (
                  <div>
                    <Label>Store Domain</Label>
                    <Input placeholder="mystore.myshopify.com" />
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'email':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-2">Email CSV Import</h2>
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Your unique email address for CSV imports:
                <div className="font-mono mt-2 p-2 bg-gray-100 rounded">
                  data-user2@euno.com
                </div>
              </AlertDescription>
            </Alert>
            <div className="prose prose-sm">
              <p>Simply forward any CSV files to this email address, and they'll automatically appear in your Euno account!</p>
              <ul>
                <li>Files are processed within 5 minutes</li>
                <li>You'll receive a confirmation email</li>
                <li>Maximum attachment size: 25MB</li>
              </ul>
            </div>
          </div>
        );

      case 'schedule':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-2">Schedule Recurring Import</h2>
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                First, select a data source to schedule
              </AlertDescription>
            </Alert>
            <div>
              <Label>Import Frequency</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Only</SelectItem>
                  <SelectItem value="15min">Every 15 minutes</SelectItem>
                  <SelectItem value="hourly">Every hour</SelectItem>
                  <SelectItem value="daily">Daily at midnight</SelectItem>
                  <SelectItem value="weekly">Weekly on Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setLocation('/connections')} variant="outline" className="w-full">
              Go to Connections to Set Up Schedule
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const renderStep3 = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-2">Preview & Map Columns</h2>
      <Alert>
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertDescription>
          Connection test successful! Here's a preview of your data structure.
        </AlertDescription>
      </Alert>
      
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-2">Detected Columns:</h3>
        <div className="space-y-2">
          {['Date', 'Product', 'Revenue', 'Customer'].map((col) => (
            <div key={col} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm">{col}</span>
              <span className="text-xs text-gray-500">Auto-detected</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <HelpCircle className="h-4 w-4" />
        <span>Column mapping looks good! You can modify this later if needed.</span>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4 text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold mb-2">Ready to Import!</h2>
      <p className="text-gray-600 mb-6">
        Everything is configured. Click below to start importing your data.
      </p>
      
      <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
        <h3 className="font-medium mb-2">Import Summary:</h3>
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Method:</span>
            <span className="font-medium">
              {importMethods.find(m => m.id === selectedMethod)?.title}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="text-green-600">Ready</span>
          </div>
        </div>
      </div>
      
      <Button 
        onClick={handleComplete} 
        size="lg" 
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? 'Setting up...' : 'Start Import'}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <CardTitle>Import Data Wizard</CardTitle>
                <span className="text-sm text-gray-600">
                  Step {currentStep} of {totalSteps}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </CardHeader>
            <CardContent>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
              
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                {currentStep < totalSteps && (
                  <Button onClick={handleNext}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-4 text-center">
            <Button variant="link" onClick={() => setLocation('/connections')}>
              Skip wizard and go to connections
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}