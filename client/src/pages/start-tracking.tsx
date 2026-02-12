import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { TrendingUp, Package, Briefcase, Coffee, Plus, FileSpreadsheet } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Business templates
const BUSINESS_TEMPLATES = {
  retail: {
    name: 'Retail Store',
    icon: Package,
    fields: ['Product Name', 'Sale Date', 'Quantity', 'Price', 'Customer Email'],
    description: 'Track products sold, dates, quantities, and customer information',
    sampleData: [
      { 'Product Name': 'Blue T-Shirt', 'Sale Date': new Date().toISOString().split('T')[0], 'Quantity': 2, 'Price': 29.99, 'Customer Email': 'john@example.com' },
      { 'Product Name': 'Running Shoes', 'Sale Date': new Date().toISOString().split('T')[0], 'Quantity': 1, 'Price': 89.99, 'Customer Email': 'jane@example.com' }
    ]
  },
  service: {
    name: 'Service Business',
    icon: Briefcase,
    fields: ['Service Type', 'Date', 'Hours', 'Client Name', 'Rate'],
    description: 'Track services provided, hours worked, and client details',
    sampleData: [
      { 'Service Type': 'Consulting', 'Date': new Date().toISOString().split('T')[0], 'Hours': 3, 'Client Name': 'ABC Corp', 'Rate': 150 },
      { 'Service Type': 'Design Work', 'Date': new Date().toISOString().split('T')[0], 'Hours': 5, 'Client Name': 'XYZ Ltd', 'Rate': 120 }
    ]
  },
  restaurant: {
    name: 'Cafe/Restaurant',
    icon: Coffee,
    fields: ['Item', 'Category', 'Price', 'Date', 'Time', 'Table Number'],
    description: 'Track menu items sold, timing, and table information',
    sampleData: [
      { 'Item': 'Cappuccino', 'Category': 'Beverage', 'Price': 4.50, 'Date': new Date().toISOString().split('T')[0], 'Time': '09:30', 'Table Number': 5 },
      { 'Item': 'Avocado Toast', 'Category': 'Food', 'Price': 12.00, 'Date': new Date().toISOString().split('T')[0], 'Time': '10:15', 'Table Number': 3 }
    ]
  }
};

export default function StartTracking() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [newEntry, setNewEntry] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    setCustomName(`My ${BUSINESS_TEMPLATES[templateKey as keyof typeof BUSINESS_TEMPLATES].name} Data`);
    setEntries(BUSINESS_TEMPLATES[templateKey as keyof typeof BUSINESS_TEMPLATES].sampleData);
    // Initialize new entry with empty values
    const fields = BUSINESS_TEMPLATES[templateKey as keyof typeof BUSINESS_TEMPLATES].fields;
    const emptyEntry: Record<string, string> = {};
    fields.forEach(field => {
      emptyEntry[field] = '';
    });
    setNewEntry(emptyEntry);
  };

  const handleAddEntry = () => {
    if (!selectedTemplate) return;
    
    const template = BUSINESS_TEMPLATES[selectedTemplate as keyof typeof BUSINESS_TEMPLATES];
    const hasAllFields = template.fields.every(field => newEntry[field] && newEntry[field].trim() !== '');
    
    if (!hasAllFields) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all fields before adding an entry.',
        variant: 'destructive'
      });
      return;
    }

    setEntries([...entries, { ...newEntry }]);
    // Reset form
    const emptyEntry: Record<string, string> = {};
    template.fields.forEach(field => {
      emptyEntry[field] = '';
    });
    setNewEntry(emptyEntry);
    
    toast({
      title: 'Entry Added',
      description: 'Your data entry has been added successfully.'
    });
  };

  const handleCreateDataSource = async () => {
    if (!selectedTemplate || !customName || entries.length === 0) {
      toast({
        title: 'Missing Information',
        description: 'Please select a template, name your data, and add at least one entry.',
        variant: 'destructive'
      });
      return;
    }

    setIsCreating(true);
    
    try {
      const template = BUSINESS_TEMPLATES[selectedTemplate as keyof typeof BUSINESS_TEMPLATES];
      
      // Create CSV content from entries
      const csvHeader = template.fields.join(',');
      const csvRows = entries.map(entry => 
        template.fields.map(field => {
          const value = entry[field]?.toString() || '';
          // Escape quotes and wrap in quotes if contains comma
          return value.includes(',') || value.includes('"') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      );
      const csvContent = [csvHeader, ...csvRows].join('\n');
      
      // Create a Blob and File object
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], `${customName}.csv`, { type: 'text/csv' });
      
      // Upload as a file
      const formData = new FormData();
      formData.append('file', file);
      
      const { getApiUrl } = await import('@/lib/queryClient');
      const response = await fetch(getApiUrl('/api/upload'), {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create data source');
      }

      const result = await response.json();
      
      toast({
        title: 'Success!',
        description: `Your "${customName}" data has been created. You can now start chatting with Euno about your data.`
      });
      
      // Redirect to chat
      setTimeout(() => {
        setLocation('/chat');
      }, 1000);
      
    } catch (error: any) {
      console.error('Error creating data source:', error);
      toast({
        title: 'Failed to Create Data',
        description: error.message || 'Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <TrendingUp className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            No data? No problem.
          </h1>
          <p className="text-xl text-gray-600">
            Start tracking and analyzing your business today.
          </p>
        </div>

        {/* Template Selection */}
        {!selectedTemplate && (
          <Card>
            <CardHeader>
              <CardTitle>What kind of business are you?</CardTitle>
              <CardDescription>
                Choose a template to get started quickly, or create your own structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {Object.entries(BUSINESS_TEMPLATES).map(([key, template]) => {
                  const Icon = template.icon;
                  return (
                    <Card 
                      key={key}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleTemplateSelect(key)}
                    >
                      <CardContent className="p-6 text-center">
                        <Icon className="w-12 h-12 mx-auto mb-3 text-primary" />
                        <h3 className="font-semibold mb-2">{template.name}</h3>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Entry */}
        {selectedTemplate && (
          <div className="space-y-6">
            {/* Back Button */}
            <Button 
              variant="ghost" 
              onClick={() => {
                setSelectedTemplate('');
                setEntries([]);
                setNewEntry({});
              }}
            >
              ← Choose Different Template
            </Button>

            {/* Data Name */}
            <Card>
              <CardHeader>
                <CardTitle>Name Your Data</CardTitle>
                <CardDescription>
                  Give your data collection a meaningful name
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., January 2025 Sales"
                />
              </CardContent>
            </Card>

            {/* Add New Entry */}
            <Card>
              <CardHeader>
                <CardTitle>Add Your Data</CardTitle>
                <CardDescription>
                  Fill in the fields below to add entries to your data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {BUSINESS_TEMPLATES[selectedTemplate as keyof typeof BUSINESS_TEMPLATES].fields.map((field) => (
                  <div key={field}>
                    <Label htmlFor={field}>{field}</Label>
                    <Input
                      id={field}
                      value={newEntry[field] || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, [field]: e.target.value })}
                      placeholder={`Enter ${field.toLowerCase()}`}
                    />
                  </div>
                ))}
                <Button onClick={handleAddEntry} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </Button>
              </CardContent>
            </Card>

            {/* Current Entries */}
            {entries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Data ({entries.length} entries)</CardTitle>
                  <CardDescription>
                    Review your entries before creating the data source
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {BUSINESS_TEMPLATES[selectedTemplate as keyof typeof BUSINESS_TEMPLATES].fields.map((field) => (
                            <th key={field} className="text-left p-2 font-medium">
                              {field}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry, idx) => (
                          <tr key={idx} className="border-b">
                            {BUSINESS_TEMPLATES[selectedTemplate as keyof typeof BUSINESS_TEMPLATES].fields.map((field) => (
                              <td key={field} className="p-2">
                                {entry[field]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-6 flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      <FileSpreadsheet className="w-4 h-4 inline mr-1" />
                      This will create a CSV file with your data
                    </p>
                    <Button 
                      onClick={handleCreateDataSource}
                      disabled={isCreating}
                    >
                      {isCreating ? 'Creating...' : 'Create Data Source'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}