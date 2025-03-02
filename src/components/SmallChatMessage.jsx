import React, { useState, useMemo, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { formatContent, getBackgroundColor, getUsernameColor } from '../utils/chatUtils.jsx'
import Badge from './Badge.jsx';

// Configuración de las animaciones para los mensajes
const messageVariants = {
  initial: { opacity: 0, y: 30, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, y: -30, scale: 0.95, transition: { duration: 0.2, ease: 'easeIn' } },
};

const SmallChatMessage = React.memo(({ message }) => {
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
    const emote = message.emotes?.find((e) => word.includes(e.name));
    if (emote) {
      return (
        <img
          key={`${i}-${emote.id}`}
          src={emote.url}
          alt={emote.name}
          className="inline-block h-5"
          title={`${emote.name} (${emote.platform})`}
        />
      );
    }
    return formatContent(word);
  };

  // Actualizar estado de múltiples líneas basado en la altura del contenido
  useLayoutEffect(() => {
    if (messageRef.current) {
      const element = messageRef.current;
      const contentHeight = element.scrollHeight;
      const computedStyle = window.getComputedStyle(element);
      const lineHeight = parseInt(computedStyle.lineHeight) || 23;
      setIsMultiline(contentHeight > lineHeight * 1.8);
    }
  }, [message.content]);

  return (
    <motion.div
      variants={messageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      ref={messageRef}
      className={`mb-4 overflow-hidden ${isMultiline ? 'rounded-l-none rounded-tl-lg' : 'rounded-l-full'}`}
    >
      {/* Contenedor principal del mensaje */}
      <div
        className={`
          bg-[#EFF1F5]
          rounded-full
          ${isSingleEmote ? 'py-0 px-0 min-w-[48px]' : 'px-0 py-0'}
          ${isMultiline ? 'rounded-bl-none rounded-tl-lg bg-red-500' : 'rounded-l-full pr-4'}
          overflow-hidden
          w-fit max-w-full
        `}
      >
        {/* Contenedor del texto y elementos del mensaje */}
        <div
          className="
            block
            break-words
            text-black
            py-0
            pr-4
            pl-2
            [text-indent:-0.5rem]
            leading-normal
          "
        >
          {/* Nombre de usuario con estilo personalizado */}
          <span
            className="font-medium whitespace-nowrap px-2 py-1 rounded-tl-lg rounded-r-full mr-1"
            style={{
              color: getUsernameColor(message),
              '--tw-ring-color': getUsernameColor(message),
              backgroundColor: getBackgroundColor(message),
            }}
          >
            {message.username}
          </span>

          {/* Renderizar medallas ordenadas (medalla del suscriptor al final) */}
          {message.badges &&
            message.badges
              .sort((a, b) => {
                const isSubA = a.name.toLowerCase().includes('subscriber');
                const isSubB = b.name.toLowerCase().includes('subscriber');
                return isSubA ? 1 : isSubB ? -1 : 0;
              })
              .map((badge, i) => <Badge key={i} badge={badge} />)}

          {/* Renderizado del contenido del mensaje */}
          {message.emotes && message.emotes.length > 0
            ? message.content.split(' ').map((word, i) => renderEmoteContent(word, i))
            : message.content.split(' ').map((word, i) => (
                <React.Fragment key={i}>{formatContent(word)}</React.Fragment>
              ))}
        </div>
      </div>
    </motion.div>
  );
});

export default SmallChatMessage;