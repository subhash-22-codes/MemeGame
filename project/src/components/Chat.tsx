import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useGame, ChatMessage } from '../context/GameContext';
import { format } from 'date-fns';

const Chat: React.FC = () => {
  const { chatMessages, sendChatMessage } = useGame();
  const [message, setMessage] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendChatMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4 text-white">Chat</h2>
      
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto mb-4 space-y-3"
      >
        {chatMessages.length === 0 ? (
          <p className="text-slate-400 text-center italic">No messages yet. Be the first to say something!</p>
        ) : (
          chatMessages.map((msg) => (
            <ChatMessageItem key={msg.id} message={msg} />
          ))
        )}
      </div>
      
      <form onSubmit={handleSendMessage} className="flex items-center mt-auto">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 bg-slate-700 text-white rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Type a message..."
        />
        <button
          type="submit"
          className="bg-purple-600 text-white p-2 rounded-r-lg hover:bg-purple-700 transition-colors"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

const ChatMessageItem: React.FC<{ message: ChatMessage }> = ({ message }) => {
  return (
    <div className="animate-fade-in">
      <div className="flex items-start">
        <div className="font-semibold text-pink-400">{message.playerName}</div>
        <div className="ml-2 text-xs text-slate-400">
          {format(new Date(message.timestamp), 'HH:mm')}
        </div>
      </div>
      <div className="text-white mt-1">{message.message}</div>
    </div>
  );
};

export default Chat;