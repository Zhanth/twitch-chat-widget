import { ChatClient } from '@twurple/chat';
import { ApiClient } from '@twurple/api';
import { RefreshingAuthProvider } from '@twurple/auth';

let instance = null;

export class ChatManager {
  constructor(config) {
    if (instance) {
      return instance;
    }
    
    this.config = config;
    // Inicializa cachés para emotes, 7TV e insignias
    this.caches = {
      emotes: new Map(),      // Caché para emotes
      sevenTV: new Map(),     // Caché para emotes de 7TV
      badges: new Map()       // Caché para insignias
    };
    this.messageHandlers = new Set(); // Conjunto de manejadores de mensajes
    this.channelUsers = new Set();    // Conjunto de usuarios del canal
    this.messageHistory = [];         // Historial de mensajes
    this.maxHistorySize = 100;        // Tamaño máximo del historial
    
    this.initializeAuth(); // Inicializa la autenticación
    this.loadFromLocalStorage(); // Carga datos del localStorage
    
    // Guarda la instancia
    instance = this;
  }

  // Método para inicializar la autenticación
  initializeAuth() {
    // Configura el proveedor de autenticación con refresco automático
    this.authProvider = new RefreshingAuthProvider({
      clientId: this.config.clientId,
      clientSecret: this.config.secretId,
      onRefresh: this.handleTokenRefresh // Callback para cuando se refresca el token
    });

    // Añade usuario con tokens y permisos
    this.authProvider.addUser('0', {
      accessToken: this.config.accessToken,
      refreshToken: this.config.refreshToken,
      expiresIn: 0,
      obtainmentTimestamp: 0,
      scope: ['chat:read', 'chat:edit']
    }, ['chat']);
    
    // Inicializa el cliente API con el proveedor de autenticación
    this.apiClient = new ApiClient({ 
      authProvider: this.authProvider,
      clientId: this.config.clientId
    });
  }

  // Carga datos desde localStorage
  loadFromLocalStorage() {
    try {
      // Recupera mensajes del historial
      const savedMessages = localStorage.getItem('twitch-chat-messages');
      if (savedMessages) {
        this.messageHistory = JSON.parse(savedMessages);
      }
      
      // Recupera emotes de 7TV
      const savedSevenTV = localStorage.getItem('twitch-chat-7tv');
      if (savedSevenTV) {
        const parsed = JSON.parse(savedSevenTV);
        Object.entries(parsed).forEach(([channel, emotes]) => {
          this.caches.sevenTV.set(channel, emotes);
        });
      }
    } catch (error) {
      console.error('Error al cargar datos de localStorage:', error);
    }
  }

  // Guarda datos en localStorage
  saveToLocalStorage() {
    try {
      // Guarda mensajes del historial
      localStorage.setItem('twitch-chat-messages', JSON.stringify(this.messageHistory));
      
      // Guarda emotes de 7TV
      const sevenTVData = {};
      this.caches.sevenTV.forEach((emotes, channel) => {
        sevenTVData[channel] = emotes;
      });
      localStorage.setItem('twitch-chat-7tv', JSON.stringify(sevenTVData));
    } catch (error) {
      console.error('Error al guardar datos en localStorage:', error);
    }
  }

  // Obtiene y almacena en caché las insignias de un usuario
  async getBadges(userInfo) {
    const userKey = `${userInfo.userId}-${userInfo.username}`;
    if (this.caches.badges.has(userKey)) {
      return this.caches.badges.get(userKey);
    }

    const badges = await this._fetchBadges(userInfo);
    this.caches.badges.set(userKey, badges);
    
    // Expira el caché después de 5 minutos
    setTimeout(() => {
      this.caches.badges.delete(userKey);
    }, 300000);

    return badges;
  }

  // Analiza emotes con optimización mediante caché
  async parseEmotes(message, msg) {
    const messageKey = `${msg.id}-${message}`;
    if (this.caches.emotes.has(messageKey)) {
      return this.caches.emotes.get(messageKey);
    }

    const emotes = await this._parseEmotesInternal(message, msg);
    this.caches.emotes.set(messageKey, emotes);

    // Limpia el caché de emotes después de 1 minuto
    setTimeout(() => {
      this.caches.emotes.delete(messageKey);
    }, 60000);

    return emotes;
  }

  // Desconecta y limpia todos los cachés
  disconnect() {
    if (this.chatClient) {
      this.chatClient.quit(); // Cierra el cliente de chat
      this.messageHandlers.clear(); // Limpia manejadores
      this.channelUsers.clear(); // Limpia usuarios
      Object.values(this.caches).forEach(cache => cache.clear()); // Limpia todos los cachés
      
      // Guarda datos antes de desconectar
      this.saveToLocalStorage();
      
      // Elimina la instancia singleton
      instance = null;
    }
  }

  // Manejador del refresco de tokens
  handleTokenRefresh = async (userId, newTokenData) => {
    console.log('Token refrescado:', newTokenData);
  };

  // Conecta al chat de los canales especificados
  async connect(channels = []) {
    // Asegura que channels sea un array
    if (!Array.isArray(channels)) {
      channels = [channels].filter(Boolean);
    }

    this.chatClient = new ChatClient({ 
      authProvider: this.authProvider,
      channels 
    });

    await this.chatClient.connect(); // Conecta al servidor
    
    if (channels.length > 0) {
      // Une a todos los canales especificados
      await Promise.all(channels.map(channel => this.chatClient.join(channel)));
    }

    this.setupMessageHandler(); // Configura el manejador de mensajes
    return this;
  }

  // Configura el manejador de mensajes del chat
  setupMessageHandler() {
    if (!this.chatClient) {
      throw new Error('Cliente de chat no inicializado. Llama a connect() primero.');
    }

    // Rastrea usuarios que se unen
    this.chatClient.onJoin((channel, user) => {
      this.channelUsers.add(user.toLowerCase());
    });

    // Rastrea usuarios que abandonan
    this.chatClient.onPart((channel, user) => {
      this.channelUsers.delete(user.toLowerCase());
    });

    // Maneja mensajes recibidos
    this.chatClient.onMessage(async (channel, user, message, msg) => {
      //console.log(`[RAW] Mensaje recibido de ${user}: ${message}`);
      
      // Filtra mensajes de bots y Nightbot específicamente
      if (this.config.botFilter && (msg?.userInfo?.isBot || user.toLowerCase() === 'nightbot'|| user.toLowerCase() === 'streamelements')) {
        //console.log(`[FILTER] Filtrado mensaje de bot/nightbot de ${user}`);
        return;
      }

      try {
        //console.log(`[PROCESS] Procesando mensaje de ${user}...`);
        const [badges, emotes] = await Promise.all([
          this.getBadges(msg.userInfo),
          this.parseEmotes(message, msg)
        ]);
        //console.log(`[EMOTES] Encontrados ${emotes.length} emotes`);
        //console.log(`[BADGES] Encontradas ${badges.length} insignias`);

        // Construye objeto con datos del mensaje
        const messageData = {
          id: msg.id,
          username: msg.userInfo.displayName,
          color: msg.userInfo.color || '#FF69B4',
          isBroadcaster: msg.userInfo.isBroadcaster,
          isMod: msg.userInfo.isMod,
          isVip: msg.userInfo.isVip,
          content: message,
          badges,
          emotes,
          timestamp: new Date(),
          channelUsers: Array.from(this.channelUsers)
        };

        // Verifica si es un mensaje de rango de hxtgg
        if (user.toLowerCase() === 'hxtgg') {
          const rankInfo = this.parseRankMessage(message);
          if (rankInfo) {
            messageData.isRankMessage = true;
            messageData.rankInfo = rankInfo;
          }
        }

        // Añade al historial y limita tamaño
        this.messageHistory.push(messageData);
        if (this.messageHistory.length > this.maxHistorySize) {
          this.messageHistory.shift();
        }
        
        // Guarda en localStorage periódicamente
        this.saveToLocalStorage();

        this.messageHandlers.forEach(handler => {
          try {
            handler(messageData);
            //console.log(`[SUCCESS] Mensaje procesado exitosamente: ${msg.id}`);
          } catch (handlerError) {
            console.error('[HANDLER ERROR]', handlerError);
          }
        });
      } catch (error) {
        console.error('[PROCESS ERROR]', {
          error,
          user,
          message: message.substring(0, 100),
          msgId: msg.id
        });
      }
    });
  }

  // Analiza mensajes de rango y extrae la información
  parseRankMessage(message) {
    // Patrón modificado para ignorar la parte #SNT y enfocarse en el formato del rango
    const rankPattern = /(.+) está en (.+) (\d+) LP \((\d+) partidas - (\d+)% WR\)/;
    const match = message.match(rankPattern);
    
    if (match) {
      // Extraemos el nombre de usuario completo (puede incluir #SNT o cualquier otro texto)
      const fullUsername = match[1].trim();
      
      return {
        username: fullUsername,
        rank: match[2].trim(),
        lp: parseInt(match[3], 10),
        games: parseInt(match[4], 10),
        winrate: parseInt(match[5], 10),
        fullRankInfo: `${match[2].trim()} ${match[3]} LP (${match[4]} partidas - ${match[5]}% WR)`
      };
    }
    
    return null;
  }

  // Registra un manejador de mensajes
  onMessage(handler) {
    // Envía el historial de mensajes al nuevo manejador
    if (this.messageHistory.length > 0) {
      this.messageHistory.forEach(msg => {
        try {
          handler(msg);
        } catch (error) {
          console.error('Error al enviar historial al nuevo manejador:', error);
        }
      });
    }
    
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler); // Devuelve función para remover manejador
  }

  // Obtiene las insignias de un usuario
  async getBadges(userInfo) {
    const badges = [];
    
    if (this.config.showBadges && userInfo && userInfo.badges) {
      try {
        if (!this.channelName) {
          this.channelName = 'ilsaint11'; // Nombre de canal por defecto
        }
        
        const channel = await this.apiClient.users.getUserByName(this.channelName);
        const channelBadges = await this.apiClient.chat.getChannelBadges(channel.id);
        
        // URLs predefinidas para insignias comunes
        const badgeUrls = {
          broadcaster: 'https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/3',
          moderator: 'https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/3',
          vip: 'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/3',
          premium: 'https://static-cdn.jtvnw.net/badges/v1/bbbe0db0-a598-423e-86d0-f9fb98ca1933/3',
          turbo: 'https://static-cdn.jtvnw.net/badges/v1/bd444ec6-8f34-4bf9-91f4-af1e3428d80f/3',
          founder: 'https://static-cdn.jtvnw.net/badges/v1/511b78a9-ab37-472f-9569-457753bbe7d3/3'
        };

        const badgeEntries = userInfo.badges instanceof Map ? 
          Array.from(userInfo.badges.entries()) : 
          Object.entries(userInfo.badges);

        // Procesa cada insignia del usuario
        for (const [id, version] of badgeEntries) {
          const lowerId = id.toLowerCase();
          
          if (lowerId === 'subscriber') {
            const subBadgeSet = channelBadges[0];
            if (subBadgeSet?.versions) {
              const subBadge = subBadgeSet.versions.find(v => v.id === version.toString());
              const rawDataSymbol = Object.getOwnPropertySymbols(subBadge)[0];
              const imageUrl4x = subBadge[rawDataSymbol].image_url_4x;

              if (subBadge) {
                badges.push({
                  name: subBadge.title,
                  url: imageUrl4x
                });
                continue;
              }
            }
          }
          
          if (badgeUrls[lowerId]) {
            badges.push({
              name: id,
              url: badgeUrls[lowerId]
            });
          } else if (this.config.customBadges[lowerId]) {
            badges.push({
              name: id,
              url: this.config.customBadges[lowerId]
            });
          }
        }
      } catch (error) {
        console.error('Error al obtener insignias:', error);
      }
    }

    return badges;
  }

  // Analiza emotes del mensaje
  async parseEmotes(message, msg) {
    const emotes = new Map();
    
    // emotes de Twitch
    msg.emoteOffsets.forEach((offsets, id) => {
      offsets.forEach(([start, end]) => {
        const name = message.slice(start, end + 1);
        const emoteUrl = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/1.0`;
        emotes.set(name, {
          id,
          url: emoteUrl,
          name,
          platform: 'twitch'
        });
      });
    });

    // Obtiene o recupera emotes de 7TV
    const channelName = msg.channelId;
    if (!this.caches.sevenTV.has(channelName)) {
      try {
        const response = await fetch(`https://7tv.io/v3/users/twitch/${channelName}`);
        const data = await response.json();
        if (data.emote_set?.emotes) {
          this.caches.sevenTV.set(channelName, data.emote_set.emotes);
        }
      } catch (error) {
        console.error('Error al obtener emotes de 7TV:', error);
        this.caches.sevenTV.set(channelName, []);
      }
    }

    const sevenTVEmotes = this.caches.sevenTV.get(channelName) || [];
    
    // Dividir el mensaje en palabras usando una expresión regular que considere solo palabras completas
    const words = message.split(/\s+/);
    
    // Verifica cada palabra contra emotes de 7TV
    for (const word of words) {
      // Solo busca emotes de 7TV si la palabra no es ya un emote de Twitch
      if (!emotes.has(word)) {
        const emote = sevenTVEmotes.find(e => e.name === word);
        if (emote) {
          emotes.set(word, {
            id: emote.id,
            url: `https://cdn.7tv.app/emote/${emote.id}/1x.webp`,
            name: word,
            platform: '7tv'
          });
        }
      }
    }

    return Array.from(emotes.values());
  }
}