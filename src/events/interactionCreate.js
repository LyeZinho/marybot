import { logger } from "../utils/logger.js";

export default async (client, interaction) => {
  // Só processar slash commands
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;
  
  // 🔍 Buscar pelo comando slash no sistema híbrido
  const slashCommand = client.commands.get(commandName + '_slash');
  
  if (!slashCommand) {
    // Verificar se existe versão prefix do comando
    const prefixCommand = client.commands.get(commandName);
    const suggestion = prefixCommand ? 
      `\n💡 Tente usar: \`m.${commandName}\` (comando prefix)` : 
      '\n📚 Use `/help` para ver comandos disponíveis';
    
    await interaction.reply({
      content: `❌ Comando slash \`/${commandName}\` não encontrado.${suggestion}`,
      flags: ['Ephemeral']
    });
    return;
  }

  try {
    // ⚡ Executar o slash command
    if (slashCommand.execute) {
      await slashCommand.execute(interaction);
    } else {
      await interaction.reply({
        content: `❌ Comando \`/${commandName}\` está com problemas de implementação.`,
        flags: ['Ephemeral']
      });
    }
    
    // 📊 Log da execução
    const user = interaction.user;
    const guild = interaction.guild ? interaction.guild.name : 'DM';
    logger.info(`[SLASH] ${user.username} (${user.id}) executou: /${commandName} em ${guild}`);
    
  } catch (error) {
    logger.error(`❌ Erro ao executar comando slash /${commandName}:`, error);
    
    const errorMessage = {
      content: `❌ Erro ao executar o comando \`/${commandName}\`. Tente novamente mais tarde.`,
      flags: ['Ephemeral']
    };
    
    try {
      if (interaction.deferred) {
        await interaction.editReply(errorMessage);
      } else if (!interaction.replied) {
        await interaction.reply(errorMessage);
      }
    } catch (replyError) {
      logger.error('Erro ao enviar mensagem de erro:', replyError);
    }
  }
};