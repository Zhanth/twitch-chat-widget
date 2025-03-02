// Generación de mensajes aleatorios para pruebas
const usernames = [
  'CoolGamer123', 'StreamNinja', 'PixelWarrior', 'TwitchMaster', 'GameLegend',
  'ProPlayer', 'EpicViewer', 'ChatHero', 'StreamFan', 'LuckyViewer'
];

const messages = [
  'Hola a todos! Cómo están hoy?',
  'Este stream es increíble! Sigue así!',
  'jajaja eso fue muy gracioso',
  'GG WP',
  'Poggers',
  'Esa jugada fue increíble!',
  'Primera vez aquí, me encanta el contenido',
  'Vamoooos!',
  'Esto está muy entretenido',
];

const colors = [
  '#FF0000',  '#0000FF', '#FF00FF',
  '#00FFFF', '#FF8000', '#8000FF', '#0080FF', '#FF0080'
];

const badges = {
  broadcaster: {
    name: 'Broadcaster',
    url: 'https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/3'
  },
  moderator: {
    name: 'Moderator',
    url: 'https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/3'
  },
  vip: {
    name: 'VIP',
    url: 'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/3'
  }
};

export const generateTestMessage = (id) => {
  const username = usernames[Math.floor(Math.random() * usernames.length)];
  
  const isReply = Math.random() < 0.20;
  let mentionedUser;
  if (isReply) {
    do {
      mentionedUser = usernames[Math.floor(Math.random() * usernames.length)];
    } while (mentionedUser === username);
  }
  
  const content = isReply 
    ? `@${mentionedUser} ${messages[Math.floor(Math.random() * messages.length)]}`
    : messages[Math.floor(Math.random() * messages.length)];
    
  const color = colors[Math.floor(Math.random() * colors.length)];

  const roles = ['broadcaster', 'moderator', 'vip', null];
  const selectedRole = roles[Math.floor(Math.random() * roles.length)];

  const messageData = {
    id: id.toString(),
    username,
    content,
    color,
    emotes: [],
    timestamp: new Date(),
    isBroadcaster: selectedRole === 'broadcaster',
    isMod: selectedRole === 'moderator',
    isVip: selectedRole === 'vip',
    badges: selectedRole ? [badges[selectedRole]] : []
  };

  return messageData;
};