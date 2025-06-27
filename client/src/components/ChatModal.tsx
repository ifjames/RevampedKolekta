import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  User, 
  Send, 
  Handshake, 
  CheckCircle, 
  MessageSquare 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatTime } from '@/utils/timeUtils';
import { toastInfo } from '@/utils/notifications';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
  read: boolean;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId?: string;
  partnerName?: string;
}

export function ChatModal({ isOpen, onClose, matchId, partnerName = 'Exchange Partner' }: ChatModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mock messages for demonstration
  useEffect(() => {
    if (isOpen && matchId) {
      setMessages([
        {
          id: '1',
          sender: 'other',
          text: 'Hi! I saw your exchange request. Still available?',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          read: true,
        },
        {
          id: '2',
          sender: user?.uid || 'me',
          text: 'Yes! When would be a good time to meet?',
          timestamp: new Date(Date.now() - 8 * 60 * 1000),
          read: true,
        },
        {
          id: '3',
          sender: 'other',
          text: 'How about at the 7-Eleven near Ayala? I can be there in 30 minutes.',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          read: true,
        },
      ]);
    }
  }, [isOpen, matchId, user?.uid]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      sender: user?.uid || 'me',
      text: newMessage.trim(),
      timestamp: new Date(),
      read: false,
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // TODO: Implement actual message sending to Firebase
    toastInfo('Message sent!');
  };

  const handleConfirmMeetup = () => {
    toastInfo('Meetup confirmation feature coming soon!');
  };

  const handleCompleteExchange = () => {
    toastInfo('Exchange completion feature coming soon!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg glass-effect border-white/20 bg-blue-900/95 h-[600px] flex flex-col p-0">
        {/* Chat Header */}
        <DialogHeader className="p-4 border-b border-white/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white font-semibold text-left">
                {partnerName}
              </DialogTitle>
              <p className="text-blue-100 text-sm">Exchange Partner</p>
            </div>
          </div>
        </DialogHeader>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.length > 0 ? (
            messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.sender === user?.uid ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  message.sender === user?.uid
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-white border border-white/20'
                }`}>
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === user?.uid ? 'text-blue-100' : 'text-blue-200'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-blue-300 mx-auto mb-3" />
              <p className="text-white font-semibold">Start the conversation</p>
              <p className="text-blue-100 text-sm">Send a message to begin chatting!</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-white/20">
          <form onSubmit={handleSendMessage} className="flex space-x-2 mb-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:ring-blue-400"
            />
            <Button 
              type="submit" 
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white"
              disabled={!newMessage.trim() || loading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>

          {/* Exchange Actions */}
          <div className="flex space-x-2">
            <Button
              onClick={handleConfirmMeetup}
              size="sm"
              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
            >
              <Handshake className="mr-1 h-4 w-4" />
              Confirm Meetup
            </Button>
            <Button
              onClick={handleCompleteExchange}
              size="sm"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              Complete Exchange
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
