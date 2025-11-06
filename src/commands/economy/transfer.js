import config from "../../config.js";
import { getOrCreateUser, getPrisma, updateUserBalance, addTransaction } from "../../database/client.js";
import { economyAntiAbuse } from "../../utils/economyAntiAbuse.js";

export default {
  name: "transfer",
  aliases: ["pay", "send", "transferir", "pagar", "enviar"],
  description: "Transfere moedas para outro usuário.",
  category: "economy",
  usage: "transfer @usuário <quantidade>",
  cooldown: 3000,
  
  async execute(client, message, args) {
    try {
      const discordId = message.author.id;
      const username = message.author.tag;
      const prisma = getPrisma();
      
      // Verificar argumentos
      if (args.length < 2) {
        return message.reply({
          embeds: [{
            color: config.colors.warning,
            title: `${config.emojis.warning} Uso Incorreto`,
            description: "Use: `m.transfer @usuário <quantidade>`\n\n**Exemplos:**\n• `m.transfer @João 500`\n• `m.pay @Maria 1000`",
          }],
        });
      }
      
      // Verificar se o usuário existe
      const sender = await getOrCreateUser(discordId, username);
      
      // Verificar rate limiting e anti-abuso
      const abuseCheck = await economyAntiAbuse.isActionAllowed(discordId, message.guild?.id, 'transfer');
      if (!abuseCheck.allowed) {
        const errorEmbed = {
          color: config.colors.error,
          title: `${config.emojis.error} Ação Bloqueada`,
          description: abuseCheck.message,
        };
        return message.reply({ embeds: [errorEmbed] });
      }
      
      // Buscar usuário alvo
      const mention = message.mentions.users.first();
      let targetUser = null;
      
      if (mention) {
        targetUser = mention;
      } else {
        // Tentar encontrar por ID
        try {
          const userId = args[0].replace(/[<@!>]/g, '');
          targetUser = await client.users.fetch(userId);
        } catch (error) {
          return message.reply({
            embeds: [{
              color: config.colors.error,
              title: `${config.emojis.error} Usuário não encontrado`,
              description: "Não foi possível encontrar este usuário.\nCertifique-se de mencionar o usuário corretamente.",
            }],
          });
        }
      }
      
      // Verificações de segurança
      if (targetUser.bot) {
        return message.reply({
          embeds: [{
            color: config.colors.error,
            title: `${config.emojis.error} Usuário Inválido`,
            description: "Você não pode transferir moedas para bots.",
          }],
        });
      }
      
      if (targetUser.id === message.author.id) {
        return message.reply({
          embeds: [{
            color: config.colors.error,
            title: `${config.emojis.error} Auto-Transferência`,
            description: "Você não pode transferir moedas para si mesmo.\n\n💡 **Dica:** Use comandos como `m.daily`, `m.work` ou `m.beg` para ganhar moedas!",
          }],
        });
      }
      
      // Verificar e parsear quantidade
      let amount = args[1];
      
      // Suporte para "all" ou "tudo"
      if (amount.toLowerCase() === 'all' || amount.toLowerCase() === 'tudo') {
        amount = sender.coins;
      } else {
        amount = parseInt(amount);
      }
      
      // Validações de quantidade
      if (isNaN(amount) || amount <= 0) {
        return message.reply({
          embeds: [{
            color: config.colors.error,
            title: `${config.emojis.error} Quantidade Inválida`,
            description: "A quantidade deve ser um número positivo.\n\n**Exemplos válidos:**\n• `500`\n• `1000`\n• `all` (todas as moedas)",
          }],
        });
      }
      
      if (amount > sender.coins) {
        return message.reply({
          embeds: [{
            color: config.colors.error,
            title: `${config.emojis.error} Saldo Insuficiente`,
            description: `Você não tem moedas suficientes.\n\n💰 **Seu saldo:** ${sender.coins.toLocaleString()} moedas\n💸 **Tentando enviar:** ${amount.toLocaleString()} moedas`,
            footer: {
              text: "Use m.balance para ver seu saldo completo",
            },
          }],
        });
      }
      
      // Limite mínimo de transferência
      const minTransfer = 10;
      if (amount < minTransfer) {
        return message.reply({
          embeds: [{
            color: config.colors.warning,
            title: `${config.emojis.warning} Valor muito baixo`,
            description: `A transferência mínima é de ${minTransfer} moedas.`,
          }],
        });
      }
      
      // Limite máximo de transferência (anti-abuso)
      const maxTransfer = 100000;
      if (amount > maxTransfer) {
        return message.reply({
          embeds: [{
            color: config.colors.warning,
            title: `${config.emojis.warning} Valor muito alto`,
            description: `A transferência máxima é de ${maxTransfer.toLocaleString()} moedas por vez.\n\n💡 **Dica:** Faça múltiplas transferências se necessário.`,
          }],
        });
      }
      
      // Taxa de transferência (2% com mínimo de 1 moeda)
      const taxRate = 0.02;
      const tax = Math.max(1, Math.floor(amount * taxRate));
      const amountAfterTax = amount - tax;
      
      // Verificar se ainda tem saldo suficiente incluindo a taxa
      if (amount + tax > sender.coins) {
        return message.reply({
          embeds: [{
            color: config.colors.error,
            title: `${config.emojis.error} Saldo Insuficiente (com taxa)`,
            description: `Você não tem saldo suficiente incluindo a taxa de transferência.\n\n💰 **Seu saldo:** ${sender.coins.toLocaleString()} moedas\n💸 **Valor + taxa:** ${(amount + tax).toLocaleString()} moedas\n📊 **Taxa (2%):** ${tax.toLocaleString()} moedas`,
          }],
        });
      }
      
      // Criar usuário destinatário se não existir
      const recipient = await getOrCreateUser(targetUser.id, targetUser.tag);
      
      // Confirmação de transferência (apenas para valores altos)
      if (amount >= 5000) {
        const confirmEmbed = {
          color: config.colors.warning,
          title: "⚠️ Confirmar Transferência",
          description: `Você está prestes a transferir uma quantia alta.\n\n💸 **Para:** ${targetUser.tag}\n💰 **Valor:** ${amount.toLocaleString()} moedas\n📊 **Taxa:** ${tax.toLocaleString()} moedas\n✅ **Destinatário receberá:** ${amountAfterTax.toLocaleString()} moedas`,
          footer: {
            text: "Reaja com ✅ para confirmar ou ❌ para cancelar (30s)",
          },
        };
        
        const confirmMsg = await message.reply({ embeds: [confirmEmbed] });
        await confirmMsg.react('✅');
        await confirmMsg.react('❌');
        
        try {
          const filter = (reaction, user) => {
            return ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
          };
          
          const collected = await confirmMsg.awaitReactions({ filter, max: 1, time: 30000, errors: ['time'] });
          const reaction = collected.first();
          
          if (reaction.emoji.name === '❌') {
            return confirmMsg.edit({
              embeds: [{
                color: config.colors.error,
                title: "❌ Transferência Cancelada",
                description: "A transferência foi cancelada pelo usuário.",
              }],
            });
          }
        } catch (error) {
          return confirmMsg.edit({
            embeds: [{
              color: config.colors.error,
              title: "⏰ Tempo Esgotado",
              description: "A transferência foi cancelada por tempo esgotado.",
            }],
          });
        }
      }
      
      // Realizar a transferência
      try {
        await prisma.$transaction(async (tx) => {
          // Remover do remetente (incluindo taxa)
          await tx.user.update({
            where: { discordId },
            data: { coins: { decrement: amount } },
          });
          
          // Adicionar ao destinatário (sem a taxa)
          await tx.user.update({
            where: { discordId: targetUser.id },
            data: { coins: { increment: amountAfterTax } },
          });
          
          // Registrar transações
          await tx.transaction.create({
            data: {
              userId: sender.id,
              type: 'TRANSFER_OUT',
              amount: -amount,
              reason: `Transferência para ${targetUser.tag}`,
            },
          });
          
          await tx.transaction.create({
            data: {
              userId: recipient.id,
              type: 'TRANSFER_IN',
              amount: amountAfterTax,
              reason: `Recebido de ${message.author.tag}`,
            },
          });
          
          // Taxa vai para o "sistema" (pode ser usado para economia do bot)
          if (tax > 0) {
            await tx.transaction.create({
              data: {
                userId: sender.id,
                type: 'FEE',
                amount: -tax,
                reason: 'Taxa de transferência',
              },
            });
          }
        });
      } catch (error) {
        console.error('Erro na transferência:', error);
        return message.reply({
          embeds: [{
            color: config.colors.error,
            title: `${config.emojis.error} Erro na Transferência`,
            description: "Ocorreu um erro ao processar a transferência. Tente novamente.",
          }],
        });
      }
      
      // Embed de sucesso
      const successEmbed = {
        color: config.colors.success,
        title: `${config.emojis.success} Transferência Realizada!`,
        description: `Você transferiu **${amount.toLocaleString()}** moedas para **${targetUser.tag}**`,
        fields: [
          {
            name: "💸 Valor Enviado",
            value: `${amount.toLocaleString()} moedas`,
            inline: true,
          },
          {
            name: "💰 Valor Recebido",
            value: `${amountAfterTax.toLocaleString()} moedas`,
            inline: true,
          },
          {
            name: "📊 Taxa (2%)",
            value: `${tax.toLocaleString()} moedas`,
            inline: true,
          },
        ],
        footer: {
          text: `Transação realizada por ${message.author.tag}`,
          icon_url: message.author.displayAvatarURL({ dynamic: true }),
        },
        timestamp: new Date().toISOString(),
      };
      
      await message.reply({ embeds: [successEmbed] });
      
      // Registrar ação no sistema anti-abuso
      await economyAntiAbuse.recordAction(discordId, message.guild?.id, 'transfer', amount, {
        recipient: targetUser.id,
        tax,
        amountAfterTax,
      });
      
      // Notificar o destinatário (se estiver no servidor)
      try {
        const recipientMember = message.guild.members.cache.get(targetUser.id);
        if (recipientMember) {
          const notificationEmbed = {
            color: config.colors.success,
            title: "💰 Você recebeu moedas!",
            description: `**${message.author.tag}** te enviou **${amountAfterTax.toLocaleString()}** moedas!`,
            footer: {
              text: "Use m.balance para ver seu novo saldo",
            },
          };
          
          // Tentar enviar DM, se falhar, ignorar silenciosamente
          try {
            await targetUser.send({ embeds: [notificationEmbed] });
          } catch (dmError) {
            // Usuário pode ter DMs desabilitadas, ignorar
          }
        }
      } catch (error) {
        // Ignorar erros de notificação
      }
      
    } catch (error) {
      console.error("Erro no comando transfer:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao processar a transferência. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },
};