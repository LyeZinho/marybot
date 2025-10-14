import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { prisma } from '../../database/client.js';
import { getRandomElement, getRandomInt } from '../../utils/random.js';

export const data = new SlashCommandBuilder()
  .setName('quiz')
  .setDescription('Responda perguntas sobre animes e ganhe XP e moedas!')
  .addStringOption(option =>
    option.setName('dificuldade')
      .setDescription('Dificuldade do quiz')
      .setRequired(false)
      .addChoices(
        { name: 'Fácil', value: '1' },
        { name: 'Médio', value: '2' },
        { name: 'Difícil', value: '3' }
      )
  );

export async function execute(interaction) {
  const difficulty = parseInt(interaction.options.getString('dificuldade')) || getRandomInt(1, 3);
  
  await interaction.deferReply();

  try {
    // Buscar ou criar usuário
    let user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          discordId: interaction.user.id,
          username: interaction.user.username
        }
      });
    }

    // Buscar perguntas da dificuldade selecionada
    let questions = await prisma.animeQuestion.findMany({
      where: { difficulty }
    });

    // Se não houver perguntas da dificuldade, buscar qualquer uma
    if (questions.length === 0) {
      questions = await prisma.animeQuestion.findMany();
    }

    if (questions.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Nenhuma pergunta disponível')
        .setDescription('Ainda não há perguntas no banco de dados. Tente novamente mais tarde!')
        .setColor('#FF4444');
      
      return await interaction.editReply({ embeds: [embed] });
    }

    // Selecionar pergunta aleatória
    const question = getRandomElement(questions);
    
    // Verificar se usuário já respondeu esta pergunta
    const alreadyAnswered = await prisma.quizScore.findFirst({
      where: {
        userId: user.id,
        questionId: question.id
      }
    });

    const difficultyEmojis = { 1: '🟢', 2: '🟡', 3: '🔴' };
    const difficultyNames = { 1: 'Fácil', 2: 'Médio', 3: 'Difícil' };

    const embed = new EmbedBuilder()
      .setTitle('🧠 Quiz de Anime')
      .setDescription(question.question)
      .setColor('#4ECDC4')
      .addFields(
        { name: '🎯 Dificuldade', value: `${difficultyEmojis[question.difficulty]} ${difficultyNames[question.difficulty]}`, inline: true },
        { name: '🎌 Anime', value: question.anime || 'Geral', inline: true },
        { name: '📂 Categoria', value: question.category || 'Geral', inline: true }
      )
      .setTimestamp()
      .setFooter({ 
        text: `Solicitado por ${interaction.user.username}`, 
        iconURL: interaction.user.displayAvatarURL() 
      });

    if (alreadyAnswered) {
      embed.addFields(
        { name: '⚠️ Aviso', value: 'Você já respondeu esta pergunta antes!', inline: false }
      );
    }

    // Criar botões para as opções
    const buttons = [
      new ButtonBuilder()
        .setCustomId(`quiz_A_${question.id}`)
        .setLabel(`A) ${question.optionA}`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`quiz_B_${question.id}`)
        .setLabel(`B) ${question.optionB}`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`quiz_C_${question.id}`)
        .setLabel(`C) ${question.optionC}`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`quiz_D_${question.id}`)
        .setLabel(`D) ${question.optionD}`)
        .setStyle(ButtonStyle.Primary)
    ];

    const row = new ActionRowBuilder().addComponents(buttons);

    await interaction.editReply({ 
      embeds: [embed], 
      components: [row] 
    });

    // Configurar collector para as respostas
    const collector = interaction.channel.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id && i.customId.startsWith('quiz_'),
      time: 30000 // 30 segundos para responder
    });

    collector.on('collect', async (buttonInteraction) => {
      if (!buttonInteraction.customId.includes(question.id.toString())) {
        return buttonInteraction.reply({
          content: '❌ Esta não é sua pergunta!',
          ephemeral: true
        });
      }

      const selectedAnswer = buttonInteraction.customId.split('_')[1];
      const isCorrect = selectedAnswer === question.correctAnswer;

      // Registrar resposta no banco
      await prisma.quizScore.create({
        data: {
          userId: user.id,
          questionId: question.id,
          isCorrect
        }
      });

      // Calcular recompensas
      let xpReward = 0;
      let coinReward = 0;

      if (isCorrect) {
        xpReward = question.difficulty * 10 + getRandomInt(5, 15);
        coinReward = question.difficulty * 5 + getRandomInt(10, 20);
        
        // Bonus se for primeira vez respondendo corretamente
        if (!alreadyAnswered) {
          xpReward *= 1.5;
          coinReward *= 1.5;
        }

        // Atualizar usuário
        await prisma.user.update({
          where: { id: user.id },
          data: {
            xp: { increment: Math.floor(xpReward) },
            coins: { increment: Math.floor(coinReward) }
          }
        });
      }

      // Criar embed de resultado
      const resultEmbed = new EmbedBuilder()
        .setTitle(isCorrect ? '🎉 Correto!' : '❌ Incorreto!')
        .setDescription(isCorrect ? 
          'Parabéns! Você acertou a pergunta!' : 
          `A resposta correta era: **${question.correctAnswer}) ${question[`option${question.correctAnswer}`]}**`
        )
        .setColor(isCorrect ? '#00FF7F' : '#FF4444')
        .addFields(
          { name: '📊 Sua Resposta', value: `${selectedAnswer}) ${question[`option${selectedAnswer}`]}`, inline: true },
          { name: '✅ Resposta Correta', value: `${question.correctAnswer}) ${question[`option${question.correctAnswer}`]}`, inline: true }
        );

      if (isCorrect) {
        resultEmbed.addFields(
          { name: '🎁 Recompensas', value: `+${Math.floor(xpReward)} XP\n+${Math.floor(coinReward)} 🪙`, inline: true }
        );

        if (alreadyAnswered) {
          resultEmbed.addFields(
            { name: '⚠️ Observação', value: 'Recompensas reduzidas por já ter respondido antes', inline: false }
          );
        }
      }

      // Desabilitar botões
      const disabledButtons = buttons.map(button => {
        const newButton = ButtonBuilder.from(button);
        
        if (button.data.custom_id === buttonInteraction.customId) {
          newButton.setStyle(isCorrect ? ButtonStyle.Success : ButtonStyle.Danger);
        } else if (button.data.custom_id.includes(question.correctAnswer)) {
          newButton.setStyle(ButtonStyle.Success);
        } else {
          newButton.setStyle(ButtonStyle.Secondary);
        }
        
        return newButton.setDisabled(true);
      });

      const disabledRow = new ActionRowBuilder().addComponents(disabledButtons);

      await buttonInteraction.update({ 
        embeds: [embed, resultEmbed], 
        components: [disabledRow] 
      });

      collector.stop();
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        // Timeout - desabilitar botões
        const timeoutButtons = buttons.map(button => 
          ButtonBuilder.from(button).setDisabled(true).setStyle(ButtonStyle.Secondary)
        );
        const timeoutRow = new ActionRowBuilder().addComponents(timeoutButtons);

        const timeoutEmbed = new EmbedBuilder()
          .setTitle('⏰ Tempo Esgotado!')
          .setDescription(`A resposta correta era: **${question.correctAnswer}) ${question[`option${question.correctAnswer}`]}**`)
          .setColor('#FFB347');

        try {
          await interaction.editReply({ 
            embeds: [embed, timeoutEmbed], 
            components: [timeoutRow] 
          });
        } catch (error) {
          console.error('Erro ao atualizar mensagem de timeout:', error);
        }
      }
    });

  } catch (error) {
    console.error('Erro no quiz:', error);
    
    const embed = new EmbedBuilder()
      .setTitle('❌ Erro')
      .setDescription('Ocorreu um erro durante o quiz. Tente novamente mais tarde.')
      .setColor('#FF4444');
    
    await interaction.editReply({ embeds: [embed] });
  }
}