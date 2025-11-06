// Sistema de gerenciamento de configurações por servidor
import { getPrisma } from "../database/client.js";

export class ConfigManager {
  constructor() {
    this.cache = new Map(); // Cache das configurações por servidor
    this.defaultConfig = {
      // Configurações básicas
      prefix: "m.",
      language: "pt-BR",
      timezone: "America/Sao_Paulo",
      
      // Configurações de comandos
      commandsEnabled: true,
      dungeonEnabled: true,
      economyEnabled: true,
      animeEnabled: true,
      
      // Configurações visuais
      colors: {
        primary: 0x5865f2,
        success: 0x00ff00,
        error: 0xff0000,
        warning: 0xffff00
      },
      
      // Emojis
      emojis: {
        ping: "🏓",
        help: "📚",
        success: "✅",
        error: "❌",
        warning: "⚠️",
        loading: "⏳"
      },
      
      // Configurações de cooldown
      cooldowns: {
        default: 3000,
        dungeon: 2000,
        economy: 5000
      },
      
      // Configurações de economia
      economy: {
        dailyAmount: 100,
        dailyCooldown: 86400000 // 24 horas
      },
      
      // Configurações de dungeon
      dungeon: {
        maxFloor: 50,
        startingHp: 100,
        xpMultiplier: 1.0,
        coinMultiplier: 1.0
      },
      
      // Canais específicos
      channels: {
        dungeon: null,
        economy: null,
        log: null
      },
      
      // Roles
      roles: {
        admin: [],
        moderator: []
      },
      
      // Configurações de salas temporárias
      roomSettings: {
        enabled: true,
        defaultTimeout: 30, // minutos
        minTimeout: 5,
        maxTimeout: 480, // 8 horas
        maxRoomsPerUser: 3,
        requiredRole: null, // ID da role necessária para criar salas
        allowExtension: true,
        maxExtension: 60, // minutos máximos para extensão
        autoCleanup: true
      },
      
      // Configurações de canais de voz extensíveis
      voiceSettings: {
        enabled: false,
        parentChannelId: null, // ID do canal pai que expande
        channelNameTemplate: "🎤 Canal #{number}", // Template do nome dos canais
        userLimit: 0, // 0 = sem limite
        bitrate: 64000, // bitrate em bps
        deleteWhenEmpty: true, // deletar quando vazio
        emptyTimeout: 30000, // tempo para deletar (ms)
        giveCreatorPermissions: true, // dar permissões ao criador
        allowedRoles: [], // roles permitidas nos canais
        maxChannels: 10 // máximo de canais simultâneos
      },

      // Configurações de mensagens de boas-vindas
      welcomeSettings: {
        enabled: false,
        channelId: null, // ID do canal onde enviar boas-vindas
        message: "Bem-vindo(a)!", // Mensagem personalizada
        backgroundColor: "#1a1a2e", // Cor de fundo
        backgroundUrl: null, // URL de imagem de fundo (opcional)
        mentionUser: true, // Mencionar o usuário na mensagem
        deleteAfter: 0 // Deletar após X segundos (0 = nunca)
      }
    };
  }

  /**
   * Obtém a configuração de um servidor
   * @param {string} guildId - ID do servidor
   * @returns {object} Configuração do servidor
   */
  async getConfig(guildId) {
    // Verificar cache primeiro
    if (this.cache.has(guildId)) {
      return this.cache.get(guildId);
    }

    try {
      const prisma = getPrisma();
      
      // Buscar ou criar guild
      let guild = await prisma.guild.findUnique({
        where: { id: guildId },
        include: { config: true }
      });

      if (!guild) {
        // Criar guild padrão
        guild = await prisma.guild.create({
          data: {
            id: guildId,
            name: "Unknown Guild"
          },
          include: { config: true }
        });
      }

      // Se não tem config, criar uma
      if (!guild.config) {
        const config = await prisma.guildConfig.create({
          data: {
            guildId: guildId
          }
        });
        guild.config = config;
      }

      // Converter para formato legível
      const formattedConfig = this.formatConfig(guild, guild.config);
      
      // Cachear
      this.cache.set(guildId, formattedConfig);
      
      return formattedConfig;
    } catch (error) {
      console.error(`Erro ao carregar config do servidor ${guildId}:`, error);
      return this.defaultConfig;
    }
  }

  /**
   * Atualiza uma configuração específica
   * @param {string} guildId - ID do servidor
   * @param {string} key - Chave da configuração
   * @param {any} value - Novo valor
   */
  async updateConfig(guildId, key, value) {
    try {
      const prisma = getPrisma();

      // Mapear chaves para campos do banco
      const updateData = this.mapConfigKeyToDatabase(key, value);
      
      // Se for update do prefix (guild), fazer update separado
      if (updateData.guildUpdate) {
        await prisma.guild.update({
          where: { id: guildId },
          data: updateData.guildUpdate
        });
      } else {
        // Atualizar na config
        await prisma.guildConfig.upsert({
          where: { guildId },
          create: {
            guildId,
            ...updateData
          },
          update: updateData
        });
      }

      // Remover do cache para forçar reload
      this.cache.delete(guildId);
      
      return true;
    } catch (error) {
      console.error(`Erro ao atualizar config ${key} do servidor ${guildId}:`, error);
      return false;
    }
  }

  /**
   * Reseta configurações para padrão
   * @param {string} guildId - ID do servidor
   */
  async resetConfig(guildId) {
    try {
      const prisma = getPrisma();
      
      await prisma.guildConfig.upsert({
        where: { guildId },
        create: { guildId },
        update: {
          commandsEnabled: true,
          dungeonEnabled: true,
          economyEnabled: true,
          animeEnabled: true,
          primaryColor: "#5865f2",
          successColor: "#00ff00",
          errorColor: "#ff0000",
          warningColor: "#ffff00",
          pingEmoji: "🏓",
          helpEmoji: "📚",
          successEmoji: "✅",
          errorEmoji: "❌",
          warningEmoji: "⚠️",
          loadingEmoji: "⏳",
          defaultCooldown: 3000,
          dungeonCooldown: 2000,
          economyCooldown: 5000,
          dailyAmount: 100,
          dailyCooldown: 86400000,
          maxDungeonFloor: 50,
          startingHp: 100,
          xpMultiplier: 1.0,
          coinMultiplier: 1.0,
          dungeonChannelId: null,
          economyChannelId: null,
          logChannelId: null,
          adminRoles: [],
          moderatorRoles: [],
          roomEnabled: true,
          roomDefaultTimeout: 30,
          roomMinTimeout: 5,
          roomMaxTimeout: 480,
          roomMaxPerUser: 3,
          roomRequiredRole: null,
          roomAllowExtension: true,
          roomMaxExtension: 60,
          roomAutoCleanup: true,
          voiceEnabled: false,
          voiceParentChannel: null,
          voiceChannelTemplate: "🎤 Canal #{number}",
          voiceUserLimit: 0,
          voiceBitrate: 64000,
          voiceDeleteWhenEmpty: true,
          voiceEmptyTimeout: 30000,
          voiceCreatorPermissions: true,
          voiceAllowedRoles: [],
          voiceMaxChannels: 10
        }
      });

      // Remover do cache
      this.cache.delete(guildId);
      
      return true;
    } catch (error) {
      console.error(`Erro ao resetar config do servidor ${guildId}:`, error);
      return false;
    }
  }

  /**
   * Formata dados do banco para uso no bot
   * @param {object} guild - Dados da guild
   * @param {object} config - Dados da configuração
   * @returns {object} Configuração formatada
   */
  formatConfig(guild, config) {
    return {
      prefix: guild.prefix || "m.",
      language: guild.language || "pt-BR",
      timezone: guild.timezone || "America/Sao_Paulo",
      
      // Habilitação de comandos
      commandsEnabled: config.commandsEnabled,
      dungeonEnabled: config.dungeonEnabled,
      economyEnabled: config.economyEnabled,
      animeEnabled: config.animeEnabled,
      
      // Cores (converter hex para número)
      colors: {
        primary: parseInt(config.primaryColor.replace('#', ''), 16),
        success: parseInt(config.successColor.replace('#', ''), 16),
        error: parseInt(config.errorColor.replace('#', ''), 16),
        warning: parseInt(config.warningColor.replace('#', ''), 16)
      },
      
      // Emojis
      emojis: {
        ping: config.pingEmoji,
        help: config.helpEmoji,
        success: config.successEmoji,
        error: config.errorEmoji,
        warning: config.warningEmoji,
        loading: config.loadingEmoji
      },
      
      // Cooldowns
      cooldowns: {
        default: config.defaultCooldown,
        dungeon: config.dungeonCooldown,
        economy: config.economyCooldown
      },
      
      // Economia
      economy: {
        dailyAmount: config.dailyAmount,
        dailyCooldown: config.dailyCooldown
      },
      
      // Dungeon
      dungeon: {
        maxFloor: config.maxDungeonFloor,
        startingHp: config.startingHp,
        xpMultiplier: config.xpMultiplier,
        coinMultiplier: config.coinMultiplier
      },
      
      // Canais
      channels: {
        dungeon: config.dungeonChannelId,
        economy: config.economyChannelId,
        log: config.logChannelId
      },
      
      // Roles
      roles: {
        admin: config.adminRoles,
        moderator: config.moderatorRoles
      },
      
      // Salas temporárias
      roomSettings: {
        enabled: config.roomEnabled,
        defaultTimeout: config.roomDefaultTimeout,
        minTimeout: config.roomMinTimeout,
        maxTimeout: config.roomMaxTimeout,
        maxRoomsPerUser: config.roomMaxPerUser,
        requiredRole: config.roomRequiredRole,
        allowExtension: config.roomAllowExtension,
        maxExtension: config.roomMaxExtension,
        autoCleanup: config.roomAutoCleanup
      },
      
      // Canais de voz extensíveis
      voiceSettings: {
        enabled: config.voiceEnabled,
        parentChannelId: config.voiceParentChannel,
        channelNameTemplate: config.voiceChannelTemplate,
        userLimit: config.voiceUserLimit,
        bitrate: config.voiceBitrate,
        deleteWhenEmpty: config.voiceDeleteWhenEmpty,
        emptyTimeout: config.voiceEmptyTimeout,
        giveCreatorPermissions: config.voiceCreatorPermissions,
        allowedRoles: config.voiceAllowedRoles,
        maxChannels: config.voiceMaxChannels
      },
      
      // Mensagens de boas-vindas
      welcomeSettings: {
        enabled: config.welcomeEnabled,
        channelId: config.welcomeChannelId,
        message: config.welcomeMessage,
        backgroundColor: config.welcomeBackgroundColor,
        backgroundUrl: config.welcomeBackgroundUrl,
        mentionUser: config.welcomeMentionUser,
        deleteAfter: config.welcomeDeleteAfter
      }
    };
  }

  /**
   * Mapeia chaves de configuração para campos do banco
   * @param {string} key - Chave da configuração
   * @param {any} value - Valor da configuração
   * @returns {object} Dados para atualizar no banco
   */
  mapConfigKeyToDatabase(key, value) {
    const mappings = {
      'prefix': { field: 'guild.prefix', value },
      'colors.primary': { field: 'primaryColor', value: typeof value === 'number' ? `#${value.toString(16).padStart(6, '0')}` : value },
      'colors.success': { field: 'successColor', value: typeof value === 'number' ? `#${value.toString(16).padStart(6, '0')}` : value },
      'colors.error': { field: 'errorColor', value: typeof value === 'number' ? `#${value.toString(16).padStart(6, '0')}` : value },
      'colors.warning': { field: 'warningColor', value: typeof value === 'number' ? `#${value.toString(16).padStart(6, '0')}` : value },
      'emojis.ping': { field: 'pingEmoji', value },
      'emojis.help': { field: 'helpEmoji', value },
      'emojis.success': { field: 'successEmoji', value },
      'emojis.error': { field: 'errorEmoji', value },
      'emojis.warning': { field: 'warningEmoji', value },
      'emojis.loading': { field: 'loadingEmoji', value },
      'cooldowns.default': { field: 'defaultCooldown', value },
      'cooldowns.dungeon': { field: 'dungeonCooldown', value },
      'cooldowns.economy': { field: 'economyCooldown', value },
      'economy.dailyAmount': { field: 'dailyAmount', value },
      'economy.dailyCooldown': { field: 'dailyCooldown', value },
      'dungeon.maxFloor': { field: 'maxDungeonFloor', value },
      'dungeon.startingHp': { field: 'startingHp', value },
      'dungeon.xpMultiplier': { field: 'xpMultiplier', value },
      'dungeon.coinMultiplier': { field: 'coinMultiplier', value },
      'channels.dungeon': { field: 'dungeonChannelId', value },
      'channels.economy': { field: 'economyChannelId', value },
      'channels.log': { field: 'logChannelId', value },
      'roles.admin': { field: 'adminRoles', value },
      'roles.moderator': { field: 'moderatorRoles', value },
      'commandsEnabled': { field: 'commandsEnabled', value },
      'dungeonEnabled': { field: 'dungeonEnabled', value },
      'economyEnabled': { field: 'economyEnabled', value },
      'animeEnabled': { field: 'animeEnabled', value },
      'roomSettings.enabled': { field: 'roomEnabled', value },
      'roomSettings.defaultTimeout': { field: 'roomDefaultTimeout', value },
      'roomSettings.minTimeout': { field: 'roomMinTimeout', value },
      'roomSettings.maxTimeout': { field: 'roomMaxTimeout', value },
      'roomSettings.maxRoomsPerUser': { field: 'roomMaxPerUser', value },
      'roomSettings.requiredRole': { field: 'roomRequiredRole', value },
      'roomSettings.allowExtension': { field: 'roomAllowExtension', value },
      'roomSettings.maxExtension': { field: 'roomMaxExtension', value },
      'roomSettings.autoCleanup': { field: 'roomAutoCleanup', value },
      'voiceSettings.enabled': { field: 'voiceEnabled', value },
      'voiceSettings.parentChannelId': { field: 'voiceParentChannel', value },
      'voiceSettings.channelNameTemplate': { field: 'voiceChannelTemplate', value },
      'voiceSettings.userLimit': { field: 'voiceUserLimit', value },
      'voiceSettings.bitrate': { field: 'voiceBitrate', value },
      'voiceSettings.deleteWhenEmpty': { field: 'voiceDeleteWhenEmpty', value },
      'voiceSettings.emptyTimeout': { field: 'voiceEmptyTimeout', value },
      'voiceSettings.giveCreatorPermissions': { field: 'voiceCreatorPermissions', value },
      'voiceSettings.allowedRoles': { field: 'voiceAllowedRoles', value },
      'voiceSettings.maxChannels': { field: 'voiceMaxChannels', value },
      'welcomeSettings.enabled': { field: 'welcomeEnabled', value },
      'welcomeSettings.channelId': { field: 'welcomeChannelId', value },
      'welcomeSettings.message': { field: 'welcomeMessage', value },
      'welcomeSettings.backgroundColor': { field: 'welcomeBackgroundColor', value },
      'welcomeSettings.backgroundUrl': { field: 'welcomeBackgroundUrl', value },
      'welcomeSettings.mentionUser': { field: 'welcomeMentionUser', value },
      'welcomeSettings.deleteAfter': { field: 'welcomeDeleteAfter', value }
    };

    const mapping = mappings[key];
    if (!mapping) {
      throw new Error(`Configuração '${key}' não encontrada`);
    }

    // Tratar casos especiais
    if (key === 'prefix') {
      // Atualizar prefix na guild, não na config
      return { guildUpdate: { prefix: mapping.value } };
    }

    return { [mapping.field]: mapping.value };
  }

  /**
   * Limpa o cache de configurações
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Obtém uma configuração específica
   * @param {string} guildId - ID do servidor
   * @param {string} key - Chave da configuração (ex: 'colors.primary')
   * @returns {any} Valor da configuração
   */
  async get(guildId, key) {
    const config = await this.getConfig(guildId);
    const keys = key.split('.');
    let value = config;
    
    for (const k of keys) {
      value = value[k];
      if (value === undefined) {
        return null;
      }
    }
    
    return value;
  }

  /**
   * Define uma configuração específica
   * @param {string} guildId - ID do servidor
   * @param {string} key - Chave da configuração
   * @param {any} value - Valor da configuração
   */
  async set(guildId, key, value) {
    return await this.updateConfig(guildId, key, value);
  }
}

// Instância global do gerenciador de configurações
export const configManager = new ConfigManager();