// Comando para defender em combate
import { combatEngine } from "../../game/combatEngine.js";
import config from "../../config.js";

export default {
  name: "defend",
  aliases: ["def", "defend", "shield", "guard"],
  description: "Assume uma postura defensiva, aumentando temporariamente sua defesa.",
  category: "dungeon",
  usage: "defend",
  cooldown: 1000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      
      // Verificar se há batalha ativa
      const battle = combatEngine.activeBattles.get(discordId);
      if (!battle) {
        return await message.reply({
          embeds: [{
            color: config.colors.error,
            title: `${config.emojis.error} Nenhuma Batalha Ativa`,
            description: "Você não está em combate no momento!",
          }]
        });
      }

      // Verificar se é o turno do jogador
      const currentTurn = battle.turnOrder[0];
      if (currentTurn.type !== 'player') {
        return await message.reply({
          embeds: [{
            color: config.colors.warning,
            title: `${config.emojis.warning} Aguarde Sua Vez`,
            description: "Não é seu turno ainda!\nAguarde o inimigo terminar sua ação.\nUse `m.status` para ver o estado da batalha",
          }]
        });
      }

      // Executar defesa
      const result = await combatEngine.executeTurn(discordId, { type: 'defend' });
      
      // Construir embed com resultado
      const embed = {
        color: config.colors.primary,
        title: `🛡️ Ação Defensiva`,
        description: result.logs.join('\n'),
        footer: {
          text: result.battleEnded ? "Batalha finalizada!" : "Use m.status para ver o estado da batalha"
        }
      };

      // Se a batalha terminou, adicionar resultado
      if (result.battleEnded) {
        embed.fields = [{
          name: "🏆 Resultado da Batalha",
          value: result.result === 'victory' ? 
            "✅ **Vitória!** Você derrotou o inimigo!" :
            "💀 **Derrota!** Você foi derrotado...",
          inline: false
        }];
      }

      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Erro no comando defend:', error);
      await message.reply({
        embeds: [{
          color: config.colors.error,
          title: `${config.emojis.error} Erro`,
          description: `Erro ao executar defesa: ${error.message}`,
        }]
      });
    }
  }
};