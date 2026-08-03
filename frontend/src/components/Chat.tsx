import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useGame, ChatMessage } from '../context/GameContext';
import { format } from 'date-fns';

const Chat: React.FC = () => {
  const { chatMessages, sendChatMessage } = useGame();
  const [message, setMessage] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendChatMessage(message.trim());
    setMessage('');
  };

  return (
    <div className="flex flex-col h-full bg-white border-2 border-[#131010] rounded-xl shadow-[4px_4px_0px_0px_#131010] overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 border-b-2 border-[#131010] bg-[#FFDDAB] font-black text-[#131010] text-sm">
        Game Chat
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 bg-white"
      >
        {chatMessages.length === 0 ? (
          <p className="text-[#131010]/50 text-center text-sm italic">
            No messages yet
          </p>
        ) : (
          chatMessages.map((msg) => (
            <ChatMessageItem key={msg.id} message={msg} />
          ))
        )}
      </div>
      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="flex border-t-2 border-[#131010]"
      >
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 text-base sm:text-sm font-medium text-[#131010] outline-none"
          maxLength={200}
        />

        <button
          type="submit"
          className="px-3 bg-[#5F8B4C] text-white border-l-2 border-[#131010] hover:bg-[#4c713d]"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

const getUserColor = (username: string) => {
  const colors = [
    '#D98324', // orange
    '#5F8B4C', // green
    '#2563EB', // blue
    '#9333EA', // purple
    '#DB2777', // pink
    '#DC2626', // red
    '#0891B2', // cyan
    '#CA8A04'  // yellow/gold
  ];

  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

const ChatMessageItem: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const color = getUserColor(message.username);

  return (
    <div className="animate-fade-in text-sm">
      <div className="flex items-center gap-2">
        <span
          className="font-bold"
          style={{ color }}
        >
          {message.username}
        </span>

        <span className="text-xs text-[#131010]/50">
          {format(new Date(message.timestamp), 'HH:mm')}
        </span>
      </div>

      <div className="text-[#131010] mt-0.5 break-words">
        {message.message}
      </div>
    </div>
  );
};

export default Chat;