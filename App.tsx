import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Message, Suggestion } from './types';
import { SYSTEM_INSTRUCTION, SUGGESTIONS, RESOURCES } from './constants';

// --- Icons ---
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

const BotIcon = () => (
  <div className="w-8 h-8 rounded-full bg-red-900 flex items-center justify-center text-white shadow-sm">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.499 5.24 50.552 50.552 0 00-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  </div>
);

const UserIcon = () => (
  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white shadow-sm">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  </div>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);


// --- Main Component ---

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: '¡Hola! Bienvenido a **Negocios Digitales** en la UAI. Soy tu asistente virtual de la materia.\n\nEstoy aquí para ayudarte con el programa, el sistema de evaluación, el trabajo práctico integrador y el uso del campus virtual.\n\n¿En qué puedo ayudarte hoy?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiClientRef = useRef<GoogleGenAI | null>(null);

  // Initialize AI Client
  useEffect(() => {
     if (process.env.API_KEY) {
         aiClientRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
     } else {
         console.error("API_KEY is missing in environment variables.");
     }
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !aiClientRef.current) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Construct history for the API
      // We limit context to last 10 messages to keep it efficient.
      const history = messages.slice(-10).map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
      }));

      // Create a chat session with the new SDK syntax
      const chat = aiClientRef.current.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: SYSTEM_INSTRUCTION
        },
        history: history
      });

      const result = await chat.sendMessageStream({ message: text });
      
      let fullResponse = "";
      const botMessageId = (Date.now() + 1).toString();
      
      // Add placeholder bot message
      setMessages(prev => [...prev, {
          id: botMessageId,
          role: 'model',
          text: "",
          timestamp: new Date()
      }]);

      for await (const chunk of result) {
        // Use .text property instead of .text() method
        const chunkText = chunk.text;
        if (chunkText) {
          fullResponse += chunkText;
          setMessages(prev => prev.map(msg => 
              msg.id === botMessageId ? { ...msg, text: fullResponse } : msg
          ));
        }
      }

    } catch (error) {
      console.error("Error generating response:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Lo siento, tuve un problema al conectar con el servidor. Por favor intenta nuevamente.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (query: string) => {
    handleSendMessage(query);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Simple formatter for markdown-like bold text ( **text** )
  const renderText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold text-red-900">{part.slice(2, -2)}</strong>;
      }
      // Handle links roughly if present in raw text
      if (part.includes('http')) {
         // Basic URL finding logic for simplicity without external regex libs
         const words = part.split(' ');
         return (
             <span key={index}>
                 {words.map((word, wIdx) => {
                     if (word.startsWith('http') || word.startsWith('www')) {
                         return <a key={wIdx} href={word} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{word} </a>
                     }
                     return word + ' ';
                 })}
             </span>
         )
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex md:flex-col w-80 bg-white border-r border-gray-200 shadow-sm z-10">
         <SidebarContent />
      </div>

      {/* Sidebar - Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
           <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setSidebarOpen(false)}></div>
           <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white transition-transform transform duration-300 ease-in-out">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                 <button onClick={() => setSidebarOpen(false)} className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                    <span className="sr-only">Close sidebar</span>
                    <CloseIcon />
                 </button>
              </div>
              <SidebarContent />
           </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
             <button className="md:hidden text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(true)}>
                <MenuIcon />
             </button>
            <div className="h-10 w-10 bg-red-900 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
                UAI
            </div>
            <div>
                <h1 className="text-xl font-bold text-gray-800 leading-tight">Negocios Digitales</h1>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Asistente de Onboarding</p>
            </div>
          </div>
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide bg-gray-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="flex-shrink-0 mt-1">
                  {msg.role === 'user' ? <UserIcon /> : <BotIcon />}
                </div>
                
                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                    className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                        ? 'bg-red-900 text-white rounded-tr-none'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                    }`}
                    >
                    {renderText(msg.text)}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                        {formatTime(msg.timestamp)}
                    </span>
                </div>
              </div>
            </div>
          ))}
           {isLoading && (
              <div className="flex justify-start w-full">
                  <div className="flex max-w-[85%] gap-3">
                      <div className="flex-shrink-0 mt-1"><BotIcon /></div>
                      <div className="bg-white border border-gray-100 px-5 py-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                      </div>
                  </div>
              </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions Area (only show if few messages) */}
        {messages.length < 3 && (
            <div className="px-4 pb-2 md:px-6">
                <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Preguntas sugeridas</p>
                <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((suggestion, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion.query)}
                            className="text-xs md:text-sm bg-white hover:bg-red-50 text-gray-700 hover:text-red-900 border border-gray-200 py-2 px-4 rounded-full transition-colors shadow-sm"
                        >
                            {suggestion.label}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4 md:p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="flex items-center gap-3 relative"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta sobre la materia..."
              className="flex-1 bg-gray-100 text-gray-800 placeholder-gray-500 border-0 rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-red-900 focus:bg-white transition-all shadow-inner"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-red-900 hover:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3.5 rounded-xl transition-all shadow-md transform active:scale-95"
            >
              <SendIcon />
            </button>
          </form>
          <div className="text-center mt-2">
              <p className="text-[10px] text-gray-400">La IA puede cometer errores. Verifica la información en el campus oficial.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarContent() {
    return (
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">Recursos Rápidos</h2>
                <p className="text-xs text-gray-500 mt-1">Links útiles para la cursada</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {RESOURCES.map((resource, idx) => (
                    <a 
                        key={idx} 
                        href={resource.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="block bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-red-100 transition-all group"
                    >
                        <div className="flex items-start gap-3">
                            <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{resource.icon}</span>
                            <div>
                                <h3 className="font-semibold text-gray-800 text-sm group-hover:text-red-900 transition-colors">{resource.title}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{resource.description}</p>
                            </div>
                        </div>
                    </a>
                ))}
                
                <div className="bg-red-50 rounded-xl p-4 border border-red-100 mt-6">
                    <h3 className="text-red-900 font-bold text-sm mb-2">📢 Recordatorio</h3>
                    <p className="text-xs text-red-800 leading-relaxed">
                        Revisá siempre el panel de <strong>Anuncios</strong> en el campus para fechas exactas de exámenes y entregas.
                    </p>
                </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50">
                <div className="text-xs text-gray-400 text-center">
                    UAI - Facultad de Ciencias Económicas<br/>
                    Negocios Digitales 2024
                </div>
            </div>
        </div>
    );
}