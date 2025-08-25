import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, ChevronRight, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Conversation {
  id: number;
  title: string | null;
  createdAt: string;
  dataSourceId: number | null;
  category: string;
}

interface ConversationSidebarProps {
  currentConversationId?: number;
  onConversationSelect: (conversationId: number | undefined) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function ConversationSidebar({ 
  currentConversationId, 
  onConversationSelect,
  isOpen = true,
  onToggle
}: ConversationSidebarProps) {
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  // Fetch all conversations for the user
  const { data: conversations = [], refetch } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
  });

  // Group conversations by date
  const groupedConversations = conversations.reduce((groups, conv) => {
    const date = new Date(conv.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    let groupKey: string;
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday';
    } else if (date > lastWeek) {
      groupKey = 'This Week';
    } else if (date > lastMonth) {
      groupKey = 'This Month';
    } else {
      groupKey = format(date, 'MMMM yyyy');
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(conv);
    return groups;
  }, {} as Record<string, Conversation[]>);

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      await apiRequest('DELETE', `/api/conversations/${conversationId}`);
    },
    onSuccess: () => {
      toast({
        title: "Conversation deleted",
        description: "The conversation has been permanently removed.",
      });
      refetch();
      // If we deleted the current conversation, start a new one
      if (deleteTarget === currentConversationId) {
        onConversationSelect(undefined);
      }
      setDeleteTarget(null);
    },
    onError: () => {
      toast({
        title: "Failed to delete",
        description: "Could not delete the conversation. Please try again.",
        variant: "destructive",
      });
      setDeleteTarget(null);
    },
  });

  const handleDelete = (e: React.MouseEvent, conversationId: number) => {
    e.stopPropagation();
    setDeleteTarget(conversationId);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteConversationMutation.mutate(deleteTarget);
    }
  };

  // Auto-refresh conversations when current conversation changes
  useEffect(() => {
    refetch();
  }, [currentConversationId, refetch]);

  return (
    <>
      <div className={cn(
        "h-full bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300",
        isOpen ? "w-64" : "w-0 overflow-hidden"
      )}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Chat History</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="lg:hidden"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4">
          <Button
            className="w-full"
            onClick={() => onConversationSelect(undefined)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2">
          {Object.keys(groupedConversations).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No conversations yet
            </p>
          ) : (
            Object.entries(groupedConversations).map(([group, convs]) => (
              <div key={group} className="mb-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase px-2 mb-2">
                  {group}
                </h3>
                <div className="space-y-1">
                  {convs.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors",
                        currentConversationId === conv.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-gray-100"
                      )}
                      onClick={() => onConversationSelect(conv.id)}
                    >
                      <MessageSquare className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-sm truncate">
                        {conv.title || `Chat from ${format(new Date(conv.createdAt), 'MMM d')}`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        onClick={(e) => handleDelete(e, conv.id)}
                      >
                        <Trash2 className="w-3 h-3 text-gray-500 hover:text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
              All messages in this conversation will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}