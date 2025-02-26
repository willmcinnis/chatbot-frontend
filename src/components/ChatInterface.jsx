import React, { useState } from 'react';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          threadId: threadId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setThreadId(data.threadId);
      
      const assistantMessage = {
        role: 'assistant',
        content: data.message,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Detailed error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto h-screen p-4 flex flex-col">
      <div className="flex-grow overflow-auto p-4 mb-4 border rounded-lg">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={message.role === 'user' ? 'text-right' : 'text-left'}
            >
              <div
                className={`inline-block p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="text-left">
              <div className="inline-block p-3 rounded-lg bg-gray-200">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow p-2 border rounded-lg"
          disabled={isLoading}
        />
        <button
          type="submit"
          className={`px-4 py-2 bg-blue-500 text-white rounded-lg ${
            isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
          }`}
          disabled={isLoading}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;