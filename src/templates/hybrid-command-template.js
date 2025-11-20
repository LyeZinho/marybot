/**
 * 🎯 TEMPLATE: Comando Híbrido
 * 
 * Este template permite criar comandos que funcionam tanto como:
 * - Comando Prefix: m.comando
 * - Comando Slash: /comando
 * 
 * INSTRUÇÕES:
 * 1. Substitua "NOME_COMANDO" pelo nome do seu comando
 * 2. Substitua "CATEGORIA_COMANDO" pela categoria (admin, economy, core, etc.)
 * 3. Implemente a lógica nos métodos execute() e executePrefix()
 * 4. Ajuste as opções do SlashCommandBuilder se necessário
 */

import { SlashCommandBuilder } from 'discord.js';
import config from "../../config.js";
import { createSuccessEmbed, createErrorEmbed } from "../../utils/embeds.js";

// 📊 Dados do Slash Command
export const data = new SlashCommandBuilder()
  .setName('NOME_COMANDO')
  .setDescription('🎯 Descrição do comando')
  // Exemplo de opções:
  .addStringOption(option =>
    option.setName('parametro')
      .setDescription('Descrição do parâmetro')
      .setRequired(false)
  );

// ⚡ Executar Slash Command
export async function execute(interaction) {
  try {
    // Obter parâmetros
    const parametro = interaction.options.getString('parametro') || null;
    
    // Defer se a operação pode demorar
    await interaction.deferReply();
    
    // Lógica específica do slash command
    const resultado = await executeLogic(interaction.client, interaction.user, [parametro]);
    
    // Resposta com indicador de tipo
    const embed = {
      ...resultado,
      footer: {
        text: `Comando executado via Slash (/) • Também disponível: m.NOME_COMANDO`
      }
    };

    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error(`Erro no slash command NOME_COMANDO:`, error);
    
    const errorEmbed = {
      color: config.colors.error,
      title: `${config.emojis.error} Erro`,
      description: "Ocorreu um erro ao executar o comando."
    };
    
    if (interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      await interaction.reply({ embeds: [errorEmbed] });
    }
  }
}

// 📝 Comando Prefix Tradicional
export default {
  name: "NOME_COMANDO",
  description: "🎯 Descrição do comando",
  category: "CATEGORIA_COMANDO",
  usage: "NOME_COMANDO [parametro]",
  cooldown: 3000, // 3 segundos
  aliases: ["alias1", "alias2"], // Opcional
  permissions: [], // Opcional: ["MANAGE_GUILD"]
  ownerOnly: false, // Opcional
  
  async execute(client, message, args) {
    try {
      // Obter parâmetros dos argumentos
      const parametro = args[0] || null;
      
      // Lógica compartilhada
      const resultado = await executeLogic(client, message.author, args);
      
      // Resposta com indicador de tipo
      const embed = {
        ...resultado,
        footer: {
          text: `Comando executado via Prefix (m.) • Também disponível: /NOME_COMANDO`
        }
      };

      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error(`Erro no prefix command NOME_COMANDO:`, error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao executar o comando."
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  }
};

// 🔄 Lógica Compartilhada entre Prefix e Slash
async function executeLogic(client, user, args) {
  // Implementar aqui a lógica principal do comando
  // Esta função é chamada tanto pelo slash quanto pelo prefix
  
  const parametro = args[0];
  
  // Exemplo de lógica
  if (!parametro) {
    return {
      color: config.colors.warning,
      title: `${config.emojis.warning} Parâmetro Necessário`,
      description: "Você precisa fornecer um parâmetro!",
      fields: [
        {
          name: "💡 Exemplos",
          value: "`m.NOME_COMANDO valor` ou `/NOME_COMANDO valor`",
          inline: false
        }
      ]
    };
  }
  
  // Processar comando...
  
  return {
    color: config.colors.success,
    title: `${config.emojis.success} Sucesso`,
    description: `Comando executado com sucesso!`,
    fields: [
      {
        name: "📊 Resultado",
        value: `Parâmetro recebido: ${parametro}`,
        inline: true
      },
      {
        name: "👤 Usuário",
        value: user.username,
        inline: true
      }
    ],
    timestamp: new Date().toISOString()
  };
}

/**
 * 📚 GUIA DE USO:
 * 
 * 1. SUBSTITUIÇÕES NECESSÁRIAS:
 *    - NOME_COMANDO: Nome real do comando (ex: "status", "balance")
 *    - CATEGORIA_COMANDO: Categoria do comando (ex: "economy", "core")
 * 
 * 2. OPÇÕES DO SLASH COMMAND:
 *    - .addStringOption(): Para texto
 *    - .addIntegerOption(): Para números
 *    - .addBooleanOption(): Para verdadeiro/falso
 *    - .addUserOption(): Para mencionar usuário
 *    - .addChannelOption(): Para mencionar canal
 * 
 * 3. TRATAMENTO DE ERROS:
 *    - Use try/catch em ambos os métodos execute
 *    - Verificar se interaction.deferred antes de responder
 * 
 * 4. LÓGICA COMPARTILHADA:
 *    - Implementar em executeLogic() para evitar duplicação
 *    - Retornar objeto embed padronizado
 * 
 * 5. VALIDAÇÕES:
 *    - Verificar permissões se necessário
 *    - Validar parâmetros antes de processar
 *    - Implementar cooldowns se necessário
 */