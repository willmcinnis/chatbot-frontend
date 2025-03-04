// Project Structure
/*
project/
├── src/
│   ├── api/
│   │   └── openai.js
│   ├── components/
│   │   ├── Chat.js
│   │   ├── Message.js
│   │   └── InputBox.js
│   ├── context/
│   │   └── ChatContext.js
│   └── App.js
├── package.json
└── .env
*/

// package.json
{
  "name": "cross-platform-gpt",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-native": "^0.72.0",
    "react-native-web": "^0.19.0",
    "expo": "^48.0.0",
    "axios": "^1.6.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/stack": "^6.3.0"
  }
}

// src/api/openai.js
import axios from 'axios';

// Create axios instance with timeout
const api = axios.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 second timeout
});

// Optional: Add response caching for identical queries
const messageCache = new Map();

export const sendMessage = async (message, systemPrompt = '') => {
  try {
    // Check cache for identical queries to avoid unnecessary API calls
    const cacheKey = `${systemPrompt}:${message}`;
    if (messageCache.has(cacheKey)) {
      console.log('Using cached response');
      return messageCache.get(cacheKey);
    }
    
    // Use a faster model by default
    const model = 'gpt-3.5-turbo'; // Faster than gpt-4
    
    const response = await api.post('/chat/completions', {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500 // Limit response length for faster responses
    });
    
    const result = response.data.choices[0].message.content;
    
    // Cache the response (only for a short time)
    messageCache.set(cacheKey, result);
    setTimeout(() => messageCache.delete(cacheKey), 5 * 60 * 1000); // Delete after 5 minutes
    
    return result;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
};

// src/context/ChatContext.js
import React, { createContext, useState, useContext } from 'react';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (message, isUser = true) => {
    setMessages(prev => [...prev, { content: message, isUser, timestamp: new Date() }]);
  };

  return (
    <ChatContext.Provider value={{ messages, addMessage, isLoading, setIsLoading }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);

// src/components/Chat.js
import React, { useCallback, useRef, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import Message from './Message';
import InputBox from './InputBox';
import { useChat } from '../context/ChatContext';
import { sendMessage } from '../api/openai';

// Using React.memo to prevent unnecessary re-renders
const MemoizedMessage = React.memo(Message);

const Chat = () => {
  const { messages, addMessage, isLoading, setIsLoading } = useChat();
  const flatListRef = useRef(null);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  // Memoize handleSend to prevent recreation on every render
  const handleSend = useCallback(async (text) => {
    if (!text.trim()) return;
    
    addMessage(text, true);
    setIsLoading(true);
    
    try {
      // Set a timeout to prevent long-running requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );
      
      const response = await Promise.race([
        sendMessage(text),
        timeoutPromise
      ]);
      
      addMessage(response, false);
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('Sorry, there was an error processing your request.', false);
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, setIsLoading]);

  // Render item function for FlatList
  const renderItem = useCallback(({ item, index }) => (
    <MemoizedMessage key={index} message={item} />
  ), []);

  // Key extractor for FlatList
  const keyExtractor = useCallback((_, index) => `msg-${index}`, []);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.messagesContainer}
        initialNumToRender={10} // Only render initial set of messages
        maxToRenderPerBatch={5} // Limit batch rendering
        windowSize={10} // Reduce window size for rendering
        onEndReachedThreshold={0.5}
      />
      <InputBox onSend={handleSend} isLoading={isLoading} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  messagesContainer: {
    flex: 1,
    padding: 10
  }
});

export default Chat;

// src/components/Message.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Message = ({ message }) => {
  const { content, isUser, timestamp } = message;
  
  return (
    <View style={[
      styles.messageContainer,
      isUser ? styles.userMessage : styles.botMessage
    ]}>
      <Text style={styles.messageText}>{content}</Text>
      <Text style={styles.timestamp}>
        {new Date(timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    maxWidth: '80%',
    padding: 10,
    marginVertical: 5,
    borderRadius: 10
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF'
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA'
  },
  messageText: {
    fontSize: 16
  },
  timestamp: {
    fontSize: 12,
    marginTop: 5,
    opacity: 0.7
  }
});

export default Message;

// src/components/InputBox.js
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native';

const InputBox = ({ onSend, isLoading }) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() && !isLoading) {
      onSend(text);
      setText('');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Type a message..."
        multiline
      />
      <TouchableOpacity 
        style={styles.sendButton} 
        onPress={handleSend}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.sendButtonText}>Send</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA'
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    padding: 10,
    justifyContent: 'center'
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  }
});

export default InputBox;

// src/App.js
import React, { useState, useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ChatProvider } from './context/ChatContext';
import Chat from './components/Chat';
import SplashScreen from './components/SplashScreen';

const Stack = createStackNavigator();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  
  // Only show splash on web platform (not mobile)
  const isSplashSupported = Platform.OS === 'web';
  
  // Handle splash screen completion
  const handleSplashComplete = () => {
    // Optional: Add a small delay for smooth transition
    setTimeout(() => {
      setShowSplash(false);
    }, 300);
  };
  
  return (
    <View style={styles.container}>
      <NavigationContainer>
        <ChatProvider>
          <Stack.Navigator>
            <Stack.Screen 
              name="Chat" 
              component={Chat}
              options={{ title: 'GPT Chat' }}
            />
          </Stack.Navigator>
        </ChatProvider>
      </NavigationContainer>
      
      {/* Show splash screen only on initial load and only on web */}
      {showSplash && isSplashSupported && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});

export default App;

export default App;
