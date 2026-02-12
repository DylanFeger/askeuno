import { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import type { ChatConversation, ChatMessage } from '@shared/schema';

interface SearchResult {
  conversation: ChatConversation;
  messages: ChatMessage[];
}

interface ConversationSearchProps {
  onConversationSelect: (conversationId: number, messages: ChatMessage[]) => void;
  currentConversationId?: number;
}

export function ConversationSearch({ onConversationSelect, currentConversationId }: ConversationSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search query
  const { data: searchResults = [], isLoading } = useQuery<SearchResult[]>({
    queryKey: ['/api/conversations/search', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      const { getApiUrl } = await import('@/lib/queryClient');
      const response = await fetch(getApiUrl(`/api/conversations/search?q=${encodeURIComponent(searchTerm)}`), {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: searchTerm.length > 1,
  });

  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showResults || searchResults.length === 0) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % searchResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = searchResults[selectedIndex];
        if (selected) {
          handleSelect(selected.conversation.id, selected.messages);
        }
      } else if (e.key === 'Escape') {
        setShowResults(false);
        inputRef.current?.blur();
      }
    };

    if (showResults) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showResults, searchResults, selectedIndex]);

  const handleSelect = (conversationId: number, messages: ChatMessage[]) => {
    onConversationSelect(conversationId, messages);
    setSearchTerm('');
    setShowResults(false);
  };

  const formatConversationDate = (date: Date | string) => {
    const conversationDate = new Date(date);
    if (isToday(conversationDate)) {
      return format(conversationDate, 'h:mm a');
    } else if (isYesterday(conversationDate)) {
      return 'Yesterday';
    } else if (isThisWeek(conversationDate)) {
      return format(conversationDate, 'EEEE');
    } else {
      return format(conversationDate, 'MMM d, yyyy');
    }
  };

  const highlightSearchTerm = (text: string) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 dark:bg-yellow-800">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl mx-auto mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search all conversations..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setShowResults(true)}
          className="pl-10 pr-10 h-12 text-lg"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
            onClick={() => {
              setSearchTerm('');
              setShowResults(false);
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && searchTerm && (
        <Card className="absolute top-full mt-2 w-full max-h-96 overflow-y-auto z-50 shadow-lg">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              Searching...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No conversations found for "{searchTerm}"
            </div>
          ) : (
            <div className="py-2">
              {searchResults.map((result, index) => {
                const { conversation, messages } = result;
                const isSelected = index === selectedIndex;
                const isCurrent = conversation.id === currentConversationId;
                
                // Find first matching message for preview
                const matchingMessage = messages.find(m => 
                  m.content.toLowerCase().includes(searchTerm.toLowerCase())
                ) || messages[0];
                
                return (
                  <button
                    key={conversation.id}
                    onClick={() => handleSelect(conversation.id, messages)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      isSelected ? 'bg-gray-50 dark:bg-gray-800' : ''
                    } ${isCurrent ? 'border-l-4 border-primary' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {conversation.title ? highlightSearchTerm(conversation.title) : 'Untitled conversation'}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatConversationDate(conversation.createdAt)}
                      </div>
                    </div>
                    {matchingMessage && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 pl-6">
                        {highlightSearchTerm(matchingMessage.content)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}