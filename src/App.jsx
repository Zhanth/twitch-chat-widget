import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChatManager } from './utils/chat';
import { generateTestMessage } from './utils/testData';
import ChatMessage from './components/ChatMessage';
import SmallChatMessage from './components/SmallChatMessage';

function App() {

  const [messages, setMessages] = useState([]);
  
  // Obtener parámetros de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const size = urlParams.get('size'); // Tamaño del mensaje: normal o pequeño
  const permanent = urlParams.get('permanent'); // Si los mensajes son permanentes
  const mode = urlParams.get('mode'); // Activar modo demo
  
  // Referencias para manejar mensajes duplicados y scroll
  const processedMessages = useRef(new Set());
  const messagesEndRef = useRef(null);

  // Configuración inicial de la aplicación
  const [config] = useState({
    theme: 'light',
    clientId: import.meta.env.VITE_TWITCH_CLIENT_ID,
    secretId: import.meta.env.VITE_TWITCH_SECRET_ID,
    accessToken: import.meta.env.VITE_TWITCH_ACCESS_TOKEN,
    refreshToken: import.meta.env.VITE_TWITCH_REFRESH_TOKEN,
    showBadges: true,
    customBadges: {},
    botFilter: true,
    messageTimeout: permanent === 'true' ? 99999999 : 10000
  });

  // Manejador de nuevos mensajes
  const handleNewMessage = useCallback((messageData) => {

    // Evitar mensajes duplicados
    if (processedMessages.current.has(messageData.id)) {
      console.log('Mensaje duplicado detectado:', messageData.id);
      return;
    }

    processedMessages.current.add(messageData.id);

    const newMessage = {
      ...messageData,
      expiryTime: Date.now() + config.messageTimeout,
    };

    setMessages(prev =>
      permanent === 'true'
        ? [...prev, newMessage] // Mantener todos los mensajes si es permanente
        : [...prev.slice(-19), newMessage] // Mantener solo los últimos 20 mensajes
    );

    // Eliminar mensajes después del timeout si no son permanentes
    if (!permanent) {
      setTimeout(() => {
        setMessages(prev => prev.filter(msg => msg.id !== messageData.id));
        processedMessages.current.delete(messageData.id);
      }, config.messageTimeout);
    }
  }, [config, permanent]);

  // Función para hacer scroll automático al último mensaje
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Efecto para scroll automático cuando hay nuevos mensajes
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Efecto para conectar al chat de Twitch
  useEffect(() => {
    if (mode !== 'demo' || !mode) {
      console.log('Conectando al chat de Twitch...')
      const chatManager = new ChatManager(config);
      const channels = [import.meta.env.VITE_TWITCH_CHANNEL];
      chatManager.connect(channels)
        .then(() => {
          console.log('¡Conectado al chat de Twitch!');
          chatManager.onMessage(handleNewMessage);
        })
        .catch(error => {
          console.error('Error al conectar:', error);
        });
      return () => chatManager.disconnect();
    }
  }, [config, handleNewMessage, mode]);

  // Efecto para generar mensajes de prueba en modo desarrollo o demo
  useEffect(() => {
    if (mode === 'demo') {
      const interval = setInterval(() => {
        handleNewMessage(generateTestMessage(Date.now()));
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [handleNewMessage, mode]);

  return (
    <div className="min-h-screen bg-transparent p-4 max-w-full max-h-full overflow-hidden flex flex-col justify-end ">
      <div className="max-w-full overflow-y-auto scrollbar-hide flex flex-col justify-end py-2">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            size === 'small' ? (
              <SmallChatMessage key={msg.id} message={msg} />
            ) : (
              <ChatMessage key={msg.id} message={msg} />
            )
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default App;