import React from 'react';

// Formatea los reply de un mensaje
export const formatContent = (word) => {
  if (word.startsWith('@')) {
    return <span className="font-bold text-pink-600">{word}</span>;
  }
  return <span>{word} </span>;
};

// Calcula el color de fondo basado en el color del mensaje
export const getBackgroundColor = (message) => {
  const hex = message.color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const mixWithWhite = (c) => Math.floor(c * 0.15 + 255 * 0.85);
  return `rgb(${mixWithWhite(r)}, ${mixWithWhite(g)}, ${mixWithWhite(b)})`;
};

// Ajusta el color del nombre de usuario para la legibilidad basado en la luminosidad
export const getUsernameColor = (message) => {
  const hex = message.color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance > 0.7) {
    return `rgb(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.7)})`;
  }
  return message.color;
};

// Calcula el color de fondo para el badge basado en el nombre del badge
export const getBadgeBackgroundColor = (badge) => {
  const badgeColors = {
    broadcaster: '#E91916',
    moderator: '#01AD04',
    vip: '#E005B9',
    premium: '#0396D6',
    turbo: '#59399A',
    founder: 'linear-gradient(180deg, #862CFF, #FF2CBF)'
  };
  const badgeName = badge.name.toLowerCase();
  return badgeColors[badgeName] || '#808080';
};