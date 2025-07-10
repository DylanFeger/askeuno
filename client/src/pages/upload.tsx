import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link, useLocation } from 'wouter';
import Navbar from '@/components/Navbar';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface FileUploadResponse {
  success: boolean;
  dataSource?: {
    id: number;
    name: string;
    rowCount: number;
    columns: string[];
    summary: string;
    validationWarnings?: string[];
  };
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dataSourceName, setDataSourceName] = useState('');
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('dataSourceName', dataSourceName || file.name);
      formData.append('description', description);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      try {
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        return response.json() as Promise<FileUploadResponse>;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data.dataSource?.validationWarnings?.length) {
        toast({
          title: 'File uploaded with warnings',
          description: data.dataSource.validationWarnings.join(', '),
          variant: 'default',
        });
      } else {
        toast({
          title: 'File uploaded successfully',
          description: `Processed ${data.dataSource?.rowCount.toLocaleString()} rows of data`,
        });
      }
      
      // Invalidate data sources query and redirect
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      setTimeout(() => setLocation('/'), 1500);
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
      setUploadProgress(0);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!dataSourceName) {
        setDataSourceName(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  }, [dataSourceName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/json': ['.json'],
    },
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024, // 500MB
  });

  const handleUpload = () => {
    if (!file) return;
    setUploadProgress(10);
    uploadMutation.mutate();
  };

  const removeFile = () => {
    setFile(null);
    setUploadProgress(0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" className="mb-4">
                ← Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Data File</h1>
            <p className="text-gray-600">Upload CSV, Excel, or JSON files to analyze your business data</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>File Upload</CardTitle>
              <CardDescription>
                Drag and drop your file or click to browse. Maximum file size: 500MB
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!file ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                    {isDragActive
                      ? 'Drop your file here...'
                      : 'Drag and drop your file here, or click to browse'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Supported formats: CSV, Excel (.xlsx, .xls), JSON
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <File className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      disabled={uploadMutation.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {uploadProgress > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  )}

                  {uploadMutation.isSuccess && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        File uploaded successfully! Redirecting to dashboard...
                      </AlertDescription>
                    </Alert>
                  )}

                  {uploadMutation.isError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {uploadMutation.error?.message || 'Upload failed'}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Data Source Name</Label>
                  <Input
                    id="name"
                    value={dataSourceName}
                    onChange={(e) => setDataSourceName(e.target.value)}
                    placeholder="e.g., Q4 Sales Report"
                    disabled={uploadMutation.isPending}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add any notes about this data..."
                    rows={3}
                    disabled={uploadMutation.isPending}
                  />
                </div>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!file || uploadMutation.isPending}
                className="w-full"
              >
                {uploadMutation.isPending ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload and Process
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Tips for Best Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Ensure your CSV files have headers in the first row</li>
                <li>• For Excel files, data will be imported from the first sheet</li>
                <li>• Dates should be in a standard format (YYYY-MM-DD recommended)</li>
                <li>• Remove any sensitive information you don't want analyzed</li>
                <li>• Large files may take a few moments to process</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}