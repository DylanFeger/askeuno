import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Database, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface FileUploadProps {
  onUploadSuccess?: (dataSource: any) => void;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest('POST', '/api/upload', formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Upload successful!',
        description: `${data.dataSource.name} has been processed and is ready for analysis.`,
      });
      onUploadSuccess?.(data.dataSource);
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Upload failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      uploadMutation.mutate(file);
    }
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
    },
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024, // 500MB
  });

  return (
    <Card className="p-8 border-2 border-dashed border-gray-300 hover:border-primary transition-colors">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload Your Data</h2>
        <p className="text-gray-600">Drag & drop files or click to browse</p>
      </div>
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          {isDragActive ? 'Drop files here' : 'Drop files here or click to upload'}
        </p>
        <p className="text-sm text-gray-500">
          Supports CSV, Excel, JSON files up to 500MB
        </p>
      </div>

      {uploadMutation.isPending && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-gray-600">Processing your file...</span>
          </div>
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm text-gray-600 text-center mb-4">Or connect your data sources:</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button 
            variant="outline" 
            className="flex items-center space-x-2"
            onClick={() => toast({
              title: "Coming Soon",
              description: "Google Sheets integration will be available soon!",
            })}
          >
            <Database className="w-4 h-4" />
            <span>Google Sheets</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center space-x-2"
            onClick={() => toast({
              title: "Coming Soon",
              description: "QuickBooks integration will be available soon!",
            })}
          >
            <Calculator className="w-4 h-4" />
            <span>QuickBooks</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center space-x-2"
            onClick={() => toast({
              title: "Coming Soon",
              description: "Excel Online integration will be available soon!",
            })}
          >
            <FileText className="w-4 h-4" />
            <span>Excel Online</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
