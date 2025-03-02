import { ChatClient } from '@twurple/chat';
import { ApiClient } from '@twurple/api';
import { RefreshingAuthProvider } from '@twurple/auth';

export class ChatManager {
  constructor(config) {
    this.config = config;
    // Inicializa cachés para emotes, 7TV e insignias
    this.caches = {
      emotes: new Map(),      // Caché para emotes
      sevenTV: new Map(),     // Caché para emotes de 7TV
      badges: new Map()       // Caché para insignias
    };
    this.messageHandlers = new Set(); // Conjunto de manejadores de mensajes
    this.channelUsers = new Set();    // Conjunto de usuarios del canal
    
    this.initializeAuth(); // Inicializa la autenticación
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
      if (this.config.botFilter && (msg?.userInfo?.isBot || user.toLowerCase() === 'nightbot')) {
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

  // Registra un manejador de mensajes
  onMessage(handler) {
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
          turbo: 'https://static-cdn.jtvnw.net/badges/v1/bd444ec6-8f34-4bf9-91f4-af1e3428d80f/3'
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
    const words = message.split(' ');
    
    // Verifica cada palabra contra emotes de 7TV
    for (const word of words) {
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

    const emoteArray = Array.from(emotes.values());
    
    // Verifica si se encontraron todos los emotes
    const hasAllEmotes = words.every(word => {
      return !sevenTVEmotes.some(e => e.name === word) || emotes.has(word);
    });

    if (!hasAllEmotes) {
      throw new Error('No se obtuvieron todos los emotes correctamente');
    }

    return emoteArray;
  }
}