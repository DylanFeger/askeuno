import { useState, useEffect } from 'react';
import { X, MessageSquare, Calendar, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { DataSource, ChatConversation, ChatMessage } from '@shared/schema';

interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSource: DataSource | null;
  onSelectConversation: (conversationId: number) => void;
}

export default function ChatHistoryModal({ 
  isOpen, 
  onClose, 
  dataSource,
  onSelectConversation 
}: ChatHistoryModalProps) {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);

  const { data: conversations = [] } = useQuery<ChatConversation[]>({
    queryKey: ['/api/data-sources', dataSource?.id, 'conversations'],
    enabled: !!dataSource?.id,
  });

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['/api/conversations', selectedConversation, 'messages'],
    enabled: !!selectedConversation,
  });

  const handleLoadConversation = (conversationId: number) => {
    onSelectConversation(conversationId);
    onClose();
  };

  if (!dataSource) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Chat History for {dataSource.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 h-[500px]">
          {/* Conversations List */}
          <div className="border-r pr-4">
            <h3 className="font-semibold mb-3 text-sm text-gray-600">Conversations</h3>
            <ScrollArea className="h-[450px]">
              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No conversations yet
                  </p>
                ) : (
                  conversations.map((conv) => (
                    <Card
                      key={conv.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedConversation === conv.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">Chat #{conv.id}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(conv.createdAt), 'MMM d, yyyy h:mm a')}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Messages Preview */}
          <div className="col-span-2">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm text-gray-600">
                {selectedConversation ? 'Messages' : 'Select a conversation'}
              </h3>
              {selectedConversation && (
                <Button
                  size="sm"
                  onClick={() => handleLoadConversation(selectedConversation)}
                >
                  Load This Chat
                </Button>
              )}
            </div>
            
            <ScrollArea className="h-[450px] border rounded-lg p-4">
              {!selectedConversation ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Select a conversation to preview messages</p>
                </div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Loading messages...</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-primary/10 ml-auto max-w-[80%]'
                          : 'bg-gray-100 mr-auto max-w-[80%]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {msg.role === 'user' ? 'You' : 'AI'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {format(new Date(msg.createdAt), 'h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}