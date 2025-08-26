import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, ChevronDown, ChevronUp, Brain, FileText, Database, AlertCircle, ChevronRight, BarChart2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'wouter';
import EunoLogo from './EunoLogo';
import GlassesIcon from './GlassesIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useTierAccess } from '@/hooks/useTierAccess';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { DataSource } from '@shared/schema';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Sage green theme color for charts
const CHART_COLORS = {
  primary: 'hsl(142, 25%, 45%)',
  secondary: 'hsl(142, 25%, 55%)',
  tertiary: 'hsl(142, 25%, 35%)',
  quaternary: 'hsl(142, 25%, 65%)',
  accent: 'hsl(142, 25%, 75%)'
};

// Chart rendering component
function DataVisualization({ visualData }: { visualData: any }) {
  if (!visualData || !visualData.data || visualData.data.length === 0) {
    return null;
  }

  const { type, data, config = {} } = visualData;

  switch (type) {
    case 'bar':
      return (
        <div className="mt-4 p-4 bg-white rounded-lg border">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xAxis || 'name'} />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey={config.yAxis || 'value'} fill={CHART_COLORS.primary} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );

    case 'line':
      return (
        <div className="mt-4 p-4 bg-white rounded-lg border">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xAxis || 'name'} />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={config.yAxis || 'value'} 
                stroke={CHART_COLORS.primary} 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );

    case 'pie':
      const RADIAN = Math.PI / 180;
      const renderCustomizedLabel = ({
        cx, cy, midAngle, innerRadius, outerRadius, percent
      }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
          <text 
            x={x} 
            y={y} 
            fill="white" 
            textAnchor={x > cx ? 'start' : 'end'} 
            dominantBaseline="central"
          >
            {`${(percent * 100).toFixed(0)}%`}
          </text>
        );
      };

      return (
        <div className="mt-4 p-4 bg-white rounded-lg border">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey={config.valueKey || 'value'}
              >
                {data.map((entry: any, index: number) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length]}
                  />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );

    default:
      return null;
  }
}

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    confidence?: number;
    suggestedFollowUps?: string[];
    dataQuality?: string;
    clarificationNeeded?: string;
    queryUsed?: string;
    visualData?: {
      type: 'bar' | 'line' | 'pie';
      data: any[];
      config?: any;
    };
  };
  createdAt?: string | Date;
  conversationId?: number;
}

interface ChatInterfaceProps {
  conversationId?: number;
  initialMessages?: ChatMessage[];
  onNewConversation?: () => void;
}

export default function ChatInterface({ conversationId, initialMessages, onNewConversation }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState(conversationId);
  const [expandedFollowUps, setExpandedFollowUps] = useState<Set<number>>(new Set());
  const [extendedResponses, setExtendedResponses] = useState(false);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<number | null>(null);
  const [includeChart, setIncludeChart] = useState(false);
  const [showRateLimitWarning, setShowRateLimitWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Tier access for charts (Professional/Enterprise feature)
  const chartAccess = useTierAccess('professional', 'Visual Charts & Graphs');
  
  // Tier access for extended responses (Professional/Enterprise feature)
  const extendedResponseAccess = useTierAccess('professional', 'Extended AI Responses');
  
  // Get user data to check tier and preferences
  const { data: userData } = useQuery<any>({
    queryKey: ['/api/auth/me'],
  });
  
  // Initialize extended responses from user preferences
  useEffect(() => {
    if (userData?.preferences?.extendedResponses !== undefined) {
      setExtendedResponses(userData.preferences.extendedResponses);
    }
  }, [userData]);

  // Fetch available data sources
  const { data: dataSources = [] } = useQuery<DataSource[]>({
    queryKey: ['/api/data-sources'],
  });

  // Get conversation details to find linked data source
  const { data: conversation } = useQuery<{ id: number; dataSourceId?: number }>({
    queryKey: ['/api/conversations', currentConversationId],
    enabled: !!currentConversationId,
  });

  // Local message state for immediate display
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(initialMessages || []);
  
  const { data: fetchedMessages = [], refetch } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat/v2/messages', currentConversationId],
    enabled: !!currentConversationId && !initialMessages,
    queryFn: async () => {
      if (!currentConversationId) return [];
      const response = await apiRequest('GET', `/api/chat/v2/messages/${currentConversationId}`);
      const data = await response.json();
      return data.messages || [];
    },
  });

  // Use local messages for immediate display, sync with fetched when available
  useEffect(() => {
    if (fetchedMessages && fetchedMessages.length > 0) {
      setLocalMessages(fetchedMessages);
    }
  }, [fetchedMessages]);
  
  // Use initialMessages if provided
  useEffect(() => {
    if (initialMessages) {
      setLocalMessages(initialMessages);
    }
  }, [initialMessages]);
  
  const messages = localMessages;

  // Update current conversation ID when prop changes
  useEffect(() => {
    if (conversationId !== currentConversationId) {
      setCurrentConversationId(conversationId);
      if (conversationId && !initialMessages) {
        refetch();
      }
    }
  }, [conversationId, currentConversationId, initialMessages, refetch]);

  // Set selected data source when conversation loads
  useEffect(() => {
    if (conversation?.dataSourceId) {
      setSelectedDataSourceId(conversation.dataSourceId);
    } else if (dataSources.length > 0 && !selectedDataSourceId) {
      // Default to the most recent data source
      setSelectedDataSourceId(dataSources[0].id);
    }
  }, [conversation, dataSources, selectedDataSourceId]);

  // Handle data source change
  const handleDataSourceChange = (value: string) => {
    const newDataSourceId = parseInt(value);
    const newDataSource = dataSources.find(ds => ds.id === newDataSourceId);
    
    if (newDataSource && newDataSourceId !== selectedDataSourceId) {
      setSelectedDataSourceId(newDataSourceId);
      // Clear current conversation when switching datasets
      setCurrentConversationId(undefined);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async ({ messageContent, forceChart = false }: { messageContent: string; forceChart?: boolean }) => {
      const finalMessage = forceChart ? `Create a chart or graph for: ${messageContent}` : messageContent;
      
      // Generate a unique request ID for deduplication
      const requestId = `${Date.now()}-${Math.random()}`;
      
      const response = await apiRequest('POST', '/api/chat/v2/send', {
        message: finalMessage,
        conversationId: currentConversationId,
        dataSourceId: selectedDataSourceId,
        requestId,
        extendedResponses,
        includeChart: forceChart || includeChart,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentConversationId(data.conversationId);
      
      // Add the AI response to local messages immediately
      const aiMessage: ChatMessage = {
        id: data.messageId,
        role: 'assistant',
        content: data.content,
        metadata: data.metadata,
        createdAt: new Date(),
        conversationId: data.conversationId,
      };
      
      setLocalMessages(prev => [...prev, aiMessage]);
      setIncludeChart(false);
      
      // Invalidate queries to sync with server
      queryClient.invalidateQueries({ queryKey: ['/api/chat/v2/messages', data.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error?.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async (forceChart: boolean = false) => {
    if (!message.trim()) return;
    
    // Check if user is approaching query limit for starter/professional tiers
    if (user?.subscriptionTier !== 'enterprise') {
      const monthlyCount = user?.monthlyQueryCount || 0;
      const tierLimits = {
        starter: 5,
        professional: 25
      };
      const limit = tierLimits[user?.subscriptionTier as keyof typeof tierLimits] || 5;
      
      if (monthlyCount >= limit) {
        setShowRateLimitWarning(true);
        return;
      }
    }
    
    const messageContent = message;
    setMessage('');
    setShowRateLimitWarning(false);
    
    // Add user message to local messages immediately
    const userMessage: ChatMessage = {
      id: Date.now(), // Temporary ID, will be replaced by server ID
      role: 'user',
      content: messageContent,
      createdAt: new Date(),
      conversationId: currentConversationId || 0,
    };
    
    setLocalMessages(prev => [...prev, userMessage]);
    
    sendMessageMutation.mutate({ messageContent, forceChart: forceChart || includeChart });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    // Scroll the container, not the entire page
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Only scroll when messages actually change in length (new message added)
  useEffect(() => {
    // Only scroll if we have messages and a new one was added
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  const selectedDataSource = dataSources.find(ds => ds.id === selectedDataSourceId);

  return (
    <Card className="p-8">
      {/* Data Source Info Bar */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2 flex-wrap">
            {selectedDataSource ? (
              <>
                {selectedDataSource.connectionType === 'upload' ? (
                  <FileText className="w-4 h-4 text-gray-600" />
                ) : (
                  <Database className="w-4 h-4 text-gray-600" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  Currently analyzing: 
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {selectedDataSource.name}
                </span>
                {selectedDataSource.rowCount && selectedDataSource.rowCount > 0 && (
                  <span className="text-xs text-gray-500">
                    ({selectedDataSource.rowCount.toLocaleString()} rows)
                  </span>
                )}
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-gray-600">
                  No dataset selected. Please upload or connect a source.
                </span>
              </div>
            )}
          </div>
          
          {dataSources.length > 1 && (
            <Select 
              value={selectedDataSourceId?.toString() || ''} 
              onValueChange={handleDataSourceChange}
            >
              <SelectTrigger className="w-full sm:w-48 h-8 text-xs">
                <SelectValue placeholder="Switch dataset" />
              </SelectTrigger>
              <SelectContent>
                {dataSources.map((ds) => (
                  <SelectItem key={ds.id} value={ds.id.toString()}>
                    <div className="flex items-center space-x-2">
                      {ds.connectionType === 'upload' ? (
                        <FileText className="w-3 h-3" />
                      ) : (
                        <Database className="w-3 h-3" />
                      )}
                      <span>{ds.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Chat with Euno</h2>
        <div className="flex items-center space-x-4">
          {(user?.subscriptionTier === 'professional' || user?.subscriptionTier === 'enterprise') && (
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-gray-500" />
              <Label htmlFor="extended-responses" className="text-sm text-gray-600 cursor-pointer">
                Extended Thinking
              </Label>
              <Switch
                id="extended-responses"
                checked={extendedResponses}
                onCheckedChange={async (checked) => {
                  try {
                    setExtendedResponses(checked);
                    await apiRequest('PATCH', '/api/auth/preferences', {
                      extendedResponses: checked
                    });
                    toast({
                      title: checked ? "Extended responses enabled" : "Concise responses enabled",
                      description: checked 
                        ? "AI will provide up to 5 sentences of analysis" 
                        : "AI will provide 1-2 sentence responses",
                    });
                  } catch (error) {
                    setExtendedResponses(!checked);
                    toast({
                      title: "Failed to update preference",
                      description: "Please try again",
                      variant: "destructive",
                    });
                  }
                }}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          )}
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Online</span>
          </div>
        </div>
      </div>

      <div ref={messagesContainerRef} className="space-y-4 mb-6 max-h-96 overflow-y-auto min-h-[300px]">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white border border-gray-200">
              <EunoLogo className="w-6 h-6" />
            </div>
            <div className="bg-gray-50 rounded-lg p-4 max-w-md">
              <p className="text-gray-800">
                Hello! I'm Euno, your AI assistant. Upload your data and I'll help you get insights instantly. Try asking me things like:
              </p>
              <ul className="mt-2 text-sm text-gray-600">
                <li>- "What were our best selling products last month?"</li>
                <li>- "Show me our revenue trends"</li>
                <li>- "Which customers spend the most?"</li>
              </ul>
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg: ChatMessage) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white border border-gray-200">
                <EunoLogo className="w-6 h-6" />
              </div>
            )}
            
            <div className={`rounded-lg p-4 max-w-md ${
              msg.role === 'user' 
                ? 'bg-primary text-white' 
                : 'bg-gray-50 text-gray-800'
            }`}>
              <p>{msg.content}</p>
              
              {/* Display data quality information */}
              {msg.role === 'assistant' && msg.metadata?.dataQuality && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <span className="font-medium">Data Quality: </span>
                  {msg.metadata.dataQuality}
                </div>
              )}
              
              {/* Display clarification needed */}
              {msg.role === 'assistant' && msg.metadata?.clarificationNeeded && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  <span className="font-medium">Clarification needed: </span>
                  {msg.metadata.clarificationNeeded}
                </div>
              )}
              
              {/* Display query used in plain English */}
              {msg.role === 'assistant' && msg.metadata?.queryUsed && (
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
                  <span className="font-medium">Query: </span>
                  {msg.metadata.queryUsed}
                </div>
              )}
              
              {/* Render charts for Enterprise tier users */}
              {msg.role === 'assistant' && msg.metadata?.visualData && (user?.subscriptionTier === 'professional' || user?.subscriptionTier === 'enterprise') && (
                <DataVisualization visualData={msg.metadata.visualData} />
              )}
              
              {msg.role === 'assistant' && msg.metadata?.confidence && (
                <div className="mt-2 flex items-center space-x-2">
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Badge variant="outline" className="text-xs cursor-help">
                            {Math.round(msg.metadata.confidence * 100)}% confident
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm bg-white border shadow-lg p-3 z-50">
                        <div className="space-y-2 text-sm">
                          <p className="font-semibold">Confidence Levels:</p>
                          <ul className="space-y-1">
                            <li><span className="font-medium">70-100%:</span> AI found clear patterns and is confident</li>
                            <li><span className="font-medium">40-70%:</span> Some patterns found, but needs more data or context</li>
                            <li><span className="font-medium">0-40%:</span> Limited data or unclear question</li>
                          </ul>
                          <p className="font-semibold mt-2">To improve confidence:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Upload more complete data</li>
                            <li>Ask specific questions</li>
                            <li>Provide date ranges or filters</li>
                            <li>Ensure data has clear patterns</li>
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
              
              {/* Display follow-up suggestions */}
              {msg.role === 'assistant' && (msg.metadata?.suggestions || msg.metadata?.suggestedFollowUps) && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {/* Handle new suggestion format */}
                    {msg.metadata?.suggestions && msg.metadata.suggestions.length > 0 && (
                      <>
                        <p className="text-xs text-gray-500 w-full mb-1">Next steps:</p>
                        {msg.metadata.suggestions.map((suggestion: any, index: number) => (
                          <button
                            key={index}
                            onClick={() => {
                              setMessage(suggestion.text || suggestion);
                              handleSendMessage(false);
                            }}
                            className={`inline-flex items-center space-x-1 text-xs px-3 py-1.5 rounded-full 
                              transition-all hover:scale-105 
                              ${suggestion.category === 'action' 
                                ? 'bg-primary text-white hover:bg-primary/90' 
                                : suggestion.category === 'deep_dive'
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : suggestion.category === 'comparison'
                                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                          >
                            {suggestion.category === 'action' && <ChevronRight className="w-3 h-3" />}
                            {suggestion.category === 'deep_dive' && <BarChart2 className="w-3 h-3" />}
                            <span>{suggestion.text || suggestion}</span>
                          </button>
                        ))}
                      </>
                    )}
                    
                    {/* Handle old suggestion format (fallback) */}
                    {!msg.metadata?.suggestions && msg.metadata?.suggestedFollowUps && (
                      msg.metadata.suggestedFollowUps.map((followUp: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => {
                            setMessage(followUp);
                            handleSendMessage(false);
                          }}
                          className="inline-flex items-center text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all hover:scale-105"
                        >
                          {followUp}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {msg.role === 'user' && (
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {sendMessageMutation.isPending && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white border border-gray-200">
              <EunoLogo className="w-6 h-6" />
            </div>
            <div className="bg-gray-50 rounded-lg p-4 max-w-md">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-gray-600">Analyzing your data...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Data source guard - show banner if no data source selected */}
      {!selectedDataSourceId && dataSources.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
          <p className="text-amber-800 text-sm">
            Please select a data source above to start asking questions about your data.
          </p>
        </div>
      )}
      
      {dataSources.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
          <p className="text-amber-800 text-sm">
            Connect a database or select a file to ask questions. 
            <Link href="/connections" className="underline ml-1">Go to Data Sources</Link>
          </p>
        </div>
      )}
      
      {/* Rate limit warning */}
      {showRateLimitWarning && (
        <Alert className="mb-3 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="space-y-2">
              <p className="font-medium">Query limit reached!</p>
              <p className="text-sm">
                {user?.subscriptionTier === 'starter' ? (
                  <>You've used all 5 queries for this hour. Upgrade to Professional for 25 queries/hour or Enterprise for unlimited queries.</>
                ) : (
                  <>You've used all 25 queries for this hour. Upgrade to Enterprise for unlimited queries.</>
                )}
              </p>
              <Link href="/subscription?upgrade=professional">
                <Button size="sm" className="mt-2">
                  <Lock className="w-3 h-3 mr-1" />
                  Upgrade Now
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Upgrade Modals */}
      <chartAccess.UpgradeModal />
      <extendedResponseAccess.UpgradeModal />

      <div className="flex items-center space-x-3">
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder={!selectedDataSourceId ? "Select a data source first..." : "Ask Euno anything..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!selectedDataSourceId || dataSources.length === 0}
          />
        </div>
        {(user?.subscriptionTier === 'professional' || user?.subscriptionTier === 'enterprise') && (
          <Button
            onClick={() => handleSendMessage(true)}
            disabled={!message.trim() || sendMessageMutation.isPending || !selectedDataSourceId}
            variant="outline"
            title="Generate Chart"
          >
            <BarChart2 className="w-4 h-4" />
          </Button>
        )}
        <Button
          onClick={() => handleSendMessage(false)}
          disabled={!message.trim() || sendMessageMutation.isPending || !selectedDataSourceId}
          className=""
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
