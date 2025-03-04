import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { formatContent, getBackgroundColor, getUsernameColor } from '../utils/chatUtils.jsx';
import Badge from './Badge.jsx';

// Configuración de las animaciones para los mensajes
const messageVariants = {
  initial: { opacity: 0, y: 30, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, y: -30, scale: 0.95, transition: { duration: 0.2, ease: 'easeIn' } },
};

const ChatMessage = React.memo(({ message }) => {
  const messageRef = React.useRef(null);
  const [isMultiline, setIsMultiline] = useState(false);
  
  // Determinar si el mensaje es un solo emote
  const isSingleEmote = useMemo(() => {
    const trimmedContent = message.content.trim();
    const hasOneWord = trimmedContent.split(/\s+/).filter(Boolean).length === 1;
    return message.emotes?.length === 1 && hasOneWord;
  }, [message.content, message.emotes]);

  // Renderizar contenido: emote o texto
  const renderEmoteContent = (word, i) => {
    // Buscar si la palabra coincide con algún emote
    const emote = message.emotes?.find((e) => word.includes(e.name));
    if (emote) {
      return (
        <img
          key={`${i}-${emote.id}`}
          src={emote.url}
          alt={emote.name}
          className={`inline-block ${isSingleEmote ? 'h-12' : 'h-6'}`} // Tamaño más grande para isSingleEmote
          title={`${emote.name} (${emote.platform})`}
        />
      );
    }
    return formatContent(word);
  };

  // Actualizar estado de múltiples líneas basado en la altura del contenido
  useEffect(() => {
    if (messageRef.current) {
      if (isSingleEmote) {
        setIsMultiline(false); // Los emotes solitarios no se consideran multilínea
      } else {
        setIsMultiline(messageRef.current.clientHeight > 30); // Verificar altura para otros mensajes
      }
    }
  }, [message.content, isSingleEmote]);

  return (
    <motion.div
      variants={messageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="mb-4"
    >
      <div className="flex flex-col">

        {/* Contenedor del nombre de usuario y badges */}
        <div className="flex items-center gap-2 mb-1 px-0">
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-r-full rounded-tl-full rounded-bl-md"
            style={{ backgroundColor: getBackgroundColor(message) }}
          >
            <span className="font-medium" style={{ color: getUsernameColor(message) }}>
              {message.username}
            </span>
          </div>

          {/* Renderizar medallas ordenadas (medalla del suscriptor al final) */}
          {message.badges &&
            message.badges
              .sort((a, b) => {
                const isSubA = a.name.toLowerCase().includes('subscriber');
                const isSubB = b.name.toLowerCase().includes('subscriber');
                return isSubA ? 1 : isSubB ? -1 : 0;
              })
              .map((badge, i) => <Badge key={i} badge={badge} size='big' />)}
        </div>

        {/* Contenedor del mensaje */}
        <div
          className={`
            bg-[#EFF1F5]
            rounded-r-full
            rounded-tl-md
            ${isMultiline ? 'rounded-bl-md ' : 'rounded-bl-full'}
            ${isSingleEmote ? 'py-2 px-4 min-w-[48px]' : isMultiline ? 'px-4 py-3' : 'px-4 py-2'}
            inline-block
            w-fit max-w-full
          `}
        >
          {/* Contenido del mensaje: procesar emotes o texto normal */}
          <p ref={messageRef} className="text-black flex items-center gap-1 flex-wrap">
            {message.emotes && message.emotes.length > 0
              ? message.content.split(' ').map((word, i) => renderEmoteContent(word, i))
              : message.content.split(' ').map((word, i) => (
                  <React.Fragment key={i}>{formatContent(word)}</React.Fragment>
                ))}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

export default ChatMessage;