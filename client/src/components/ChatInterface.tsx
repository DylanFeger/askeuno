import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, ChevronDown, ChevronUp, Mic, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    confidence?: number;
    suggestedFollowUps?: string[];
  };
  createdAt: string;
}

interface ChatInterfaceProps {
  conversationId?: number;
}

export default function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState(conversationId);
  const [expandedFollowUps, setExpandedFollowUps] = useState<Set<number>>(new Set());
  const [extendedThinking, setExtendedThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, refetch } = useQuery({
    queryKey: ['/api/conversations', currentConversationId, 'messages'],
    enabled: !!currentConversationId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageContent: string) => {
      const response = await apiRequest('POST', '/api/chat', {
        message: messageContent,
        conversationId: currentConversationId,
        extendedThinking,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentConversationId(data.conversationId);
      refetch();
    },
  });

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const messageContent = message;
    setMessage('');
    
    sendMessageMutation.mutate(messageContent);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <Card className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Ask Your AI Assistant</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Brain className="w-4 h-4 text-gray-500" />
            <Label htmlFor="extended-thinking" className="text-sm text-gray-600 cursor-pointer">
              Extended Thinking
            </Label>
            <Switch
              id="extended-thinking"
              checked={extendedThinking}
              onCheckedChange={setExtendedThinking}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Online</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6 max-h-96 overflow-y-auto min-h-[300px]">
        {/* Welcome message */}
        {(!messages || messages.length === 0) && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-50 rounded-lg p-4 max-w-md">
              <p className="text-gray-800">
                Hello! I'm your AI assistant. Upload your data and I'll help you get insights instantly. Try asking me things like:
              </p>
              <ul className="mt-2 text-sm text-gray-600">
                <li>• "What were our best selling products last month?"</li>
                <li>• "Show me our revenue trends"</li>
                <li>• "Which customers spend the most?"</li>
              </ul>
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages?.map((msg: ChatMessage) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div className={`rounded-lg p-4 max-w-md ${
              msg.role === 'user' 
                ? 'bg-primary text-white' 
                : 'bg-gray-50 text-gray-800'
            }`}>
              <p>{msg.content}</p>
              
              {msg.role === 'assistant' && msg.metadata?.confidence && (
                <div className="mt-2 flex items-center space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs cursor-help">
                          {Math.round(msg.metadata.confidence * 100)}% confident
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
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
              
              {msg.role === 'assistant' && msg.metadata?.suggestedFollowUps && (
                <div className="mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary/90 p-0"
                    onClick={() => {
                      const newExpanded = new Set(expandedFollowUps);
                      if (expandedFollowUps.has(msg.id)) {
                        newExpanded.delete(msg.id);
                      } else {
                        newExpanded.add(msg.id);
                      }
                      setExpandedFollowUps(newExpanded);
                    }}
                  >
                    {expandedFollowUps.has(msg.id) ? (
                      <ChevronUp className="w-4 h-4 mr-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 mr-1" />
                    )}
                    {expandedFollowUps.has(msg.id) ? 'Hide' : 'Show'} suggested questions
                  </Button>
                  
                  {expandedFollowUps.has(msg.id) && (
                    <div className="mt-2 space-y-2">
                      {msg.metadata.suggestedFollowUps.map((followUp, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setMessage(followUp);
                            handleSendMessage();
                          }}
                          className="block w-full text-left text-sm bg-primary/10 hover:bg-primary/20 text-primary p-2 rounded border border-primary/30 transition-colors"
                        >
                          {followUp}
                        </button>
                      ))}
                    </div>
                  )}
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
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
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

      <div className="flex items-center space-x-3">
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Ask me anything about your data..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pr-12"
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-primary"
            onClick={() => alert('Voice input coming soon!')}
            aria-label="Voice input"
            title="Voice input coming soon"
          >
            <Mic className="w-4 h-4" />
          </Button>
        </div>
        <Button
          onClick={handleSendMessage}
          disabled={!message.trim() || sendMessageMutation.isPending}
          className=""
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
