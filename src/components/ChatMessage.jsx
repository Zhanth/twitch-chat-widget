import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { formatContent, getBackgroundColor, getUsernameColor } from '../utils/chatUtils.jsx';
import Badge from './Badge.jsx';
import HXTRank from './HXTRank.jsx';

// Configuración de las animaciones para los mensajes
const messageVariants = {
  initial: { opacity: 0, y: 30, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, y: -30, scale: 0.95, transition: { duration: 0.2, ease: 'easeIn' } },
};

const ChatMessage = React.memo(({ message }) => {
  const messageRef = React.useRef(null);
  const [isMultiline, setIsMultiline] = useState(false);
  const [contentLines, setContentLines] = useState([]);
  const maxLineWidth = 400; // Ancho máximo aproximado para cada línea en píxeles
  
  // if (message.isRankMessage && message.rankInfo) {
  //   return <HXTRank rankInfo={message.rankInfo} />;
  // }

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

  // Distribuir palabras en líneas de longitud similar
  useEffect(() => {
    if (isSingleEmote) {
      setContentLines([message.content]); // Para emotes solitarios, mantener una sola línea
      return;
    }

    const words = message.content.split(' ');
    const lines = [];
    let currentLine = [];
    let currentLineLength = 0;
    const avgWordLength = message.content.length / words.length;
    
    // Estimación simple: cada palabra tiene un ancho proporcional a su longitud
    // Ajustar este valor según el tamaño de fuente y estilo
    const charWidth = 8; // Ancho aproximado de un carácter en píxeles
    
    words.forEach(word => {
      // Estimar el ancho de la palabra (incluyendo espacio)
      const wordWidth = (word.length + 1) * charWidth;
      
      // Si es un emote, usar un ancho fijo aproximado
      const isEmote = message.emotes?.some(e => word.includes(e.name));
      const estimatedWidth = isEmote ? 30 : wordWidth;
      
      // Si añadir esta palabra excede el ancho máximo, comenzar nueva línea
      if (currentLineLength + estimatedWidth > maxLineWidth && currentLine.length > 0) {
        lines.push([...currentLine]);
        currentLine = [];
        currentLineLength = 0;
      }
      
      currentLine.push(word);
      currentLineLength += estimatedWidth;
    });
    
    // Añadir la última línea si contiene palabras
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    
    setContentLines(lines);
    setIsMultiline(lines.length > 1);
  }, [message.content, message.emotes, isSingleEmote]);

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
            ${isMultiline ? '!rounded-r-2xl !rounded-tl-none !rounded-bl-2xl' : 'rounded-bl-full'}
            ${isSingleEmote ? 'py-2 px-4 min-w-[48px]' : isMultiline ? 'px-4 py-3' : 'px-4 py-2'}
            inline-block
            w-fit max-w-full
          `}
        >
          {/* Contenido del mensaje: procesar líneas justificadas */}
          <div ref={messageRef} className="text-black">
            {isSingleEmote ? (
              <p className="flex items-center gap-1">
                {renderEmoteContent(message.content, 0)}
              </p>
            ) : (
              contentLines.map((line, lineIndex) => (
                <p key={lineIndex} className="flex items-center gap-1 mb-1">
                  {line.map((word, wordIndex) => (
                    <React.Fragment key={`${lineIndex}-${wordIndex}`}>
                      {renderEmoteContent(word, wordIndex)}
                      {wordIndex < line.length - 1 && ' '}
                    </React.Fragment>
                  ))}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default ChatMessage;