// Evento para monitorar mudanças de estado em canais de voz
// Integra com o sistema de canais extensíveis
import { logger } from '../utils/logger.js';
import { voiceManager } from '../game/voiceManager.js';

export default async (client, oldState, newState) => {
  try {
    // Verificar se o VoiceManager está inicializado
    if (!voiceManager.isInitialized) {
      return;
    }

    // Ignorar bots
    if (newState.member?.user.bot || oldState.member?.user.bot) {
      return;
    }

    // Log para debug (opcional - apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      const user = newState.member?.displayName || oldState.member?.displayName || 'Unknown';
      const oldChannel = oldState.channel?.name || 'None';
      const newChannel = newState.channel?.name || 'None';
      
      if (oldChannel !== newChannel) {
        logger.debug(`🎤 Voice Update: ${user} | ${oldChannel} → ${newChannel}`);
      }
    }

    // Processar mudança de estado através do VoiceManager
    await voiceManager.handleVoiceStateUpdate(oldState, newState);

  } catch (error) {
    logger.error('Erro no evento voiceStateUpdate:', error);
  }
};