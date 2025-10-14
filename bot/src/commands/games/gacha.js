import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/client.js';
import { getRandomElement, getRandomInt } from '../../utils/random.js';

export const data = new SlashCommandBuilder()
  .setName('gacha')
  .setDescription('Invoca um personagem aleatório usando moedas')
  .addStringOption(option =>
    option.setName('tipo')
      .setDescription('Tipo de invocação')
      .setRequired(false)
      .addChoices(
        { name: 'Simples (50 moedas)', value: 'single' },
        { name: '10x Pulls (450 moedas)', value: 'multi' }
      )
  );

export async function execute(interaction) {
  const tipo = interaction.options.getString('tipo') || 'single';
  const cost = tipo === 'multi' ? 450 : 50;
  const pulls = tipo === 'multi' ? 10 : 1;
  
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

    // Verificar se tem moedas suficientes
    if (user.coins < cost) {
      const embed = new EmbedBuilder()
        .setTitle('💰 Moedas Insuficientes')
        .setDescription(`Você precisa de **${cost} 🪙** para esta invocação.\nVocê tem apenas **${user.coins} 🪙**.`)
        .setColor('#FF4444')
        .addFields(
          { name: '💡 Dica', value: 'Use `/daily` para ganhar moedas grátis!', inline: false }
        );
      
      return await interaction.editReply({ embeds: [embed] });
    }

    // Buscar personagens disponíveis ou criar alguns padrão
    let characters = await prisma.character.findMany();
    
    if (characters.length === 0) {
      // Criar alguns personagens padrão
      const defaultCharacters = [
        { name: 'Naruto Uzumaki', anime: 'Naruto', rarity: 3, attack: 85, defense: 70, luck: 90 },
        { name: 'Sasuke Uchiha', anime: 'Naruto', rarity: 4, attack: 95, defense: 75, luck: 70 },
        { name: 'Luffy', anime: 'One Piece', rarity: 5, attack: 100, defense: 80, luck: 95 },
        { name: 'Zoro', anime: 'One Piece', rarity: 4, attack: 98, defense: 85, luck: 60 },
        { name: 'Goku', anime: 'Dragon Ball Z', rarity: 5, attack: 100, defense: 90, luck: 85 },
        { name: 'Vegeta', anime: 'Dragon Ball Z', rarity: 4, attack: 97, defense: 88, luck: 65 },
        { name: 'Ichigo', anime: 'Bleach', rarity: 4, attack: 92, defense: 78, luck: 75 },
        { name: 'Edward Elric', anime: 'Fullmetal Alchemist', rarity: 3, attack: 80, defense: 70, luck: 85 },
        { name: 'Tanjiro', anime: 'Demon Slayer', rarity: 3, attack: 82, defense: 75, luck: 88 },
        { name: 'Saitama', anime: 'One Punch Man', rarity: 5, attack: 100, defense: 100, luck: 50 },
        { name: 'Senku', anime: 'Dr. Stone', rarity: 2, attack: 30, defense: 40, luck: 100 },
        { name: 'Rimuru', anime: 'That Time I Got Reincarnated as a Slime', rarity: 5, attack: 98, defense: 95, luck: 90 },
        { name: 'Mob', anime: 'Mob Psycho 100', rarity: 4, attack: 95, defense: 60, luck: 80 },
        { name: 'Natsu', anime: 'Fairy Tail', rarity: 3, attack: 88, defense: 72, luck: 77 },
        { name: 'Kirito', anime: 'Sword Art Online', rarity: 3, attack: 85, defense: 70, luck: 75 }
      ];

      for (const char of defaultCharacters) {
        await prisma.character.create({ data: char });
      }
      
      characters = await prisma.character.findMany();
    }

    // Sistema de rates
    const rates = {
      5: 0.01, // 1% para 5 estrelas
      4: 0.05, // 5% para 4 estrelas
      3: 0.20, // 20% para 3 estrelas
      2: 0.30, // 30% para 2 estrelas
      1: 0.44  // 44% para 1 estrela
    };

    function rollRarity() {
      const roll = Math.random();
      let cumulative = 0;
      
      for (let rarity = 5; rarity >= 1; rarity--) {
        cumulative += rates[rarity];
        if (roll <= cumulative) {
          return rarity;
        }
      }
      return 1;
    }

    const results = [];
    let totalXP = 0;
    
    for (let i = 0; i < pulls; i++) {
      const rarity = rollRarity();
      const availableChars = characters.filter(c => c.rarity === rarity);
      
      if (availableChars.length === 0) {
        // Fallback para qualquer raridade se não houver da raridade sorteada
        const randomChar = getRandomElement(characters);
        results.push(randomChar);
      } else {
        const rolledChar = getRandomElement(availableChars);
        results.push(rolledChar);
      }
      
      // XP baseado na raridade
      totalXP += rarity * 5;
    }

    // Atualizar usuário (remover moedas, adicionar XP)
    await prisma.user.update({
      where: { discordId: interaction.user.id },
      data: {
        coins: { decrement: cost },
        xp: { increment: totalXP }
      }
    });

    // Adicionar personagens ao inventário do usuário
    for (const char of results) {
      await prisma.userCharacter.upsert({
        where: {
          userId_characterId: {
            userId: user.id,
            characterId: char.id
          }
        },
        update: {}, // Se já tem, não faz nada
        create: {
          userId: user.id,
          characterId: char.id
        }
      });
    }

    // Criar embed do resultado
    const embed = new EmbedBuilder()
      .setTitle(`🎲 Resultado do Gacha${tipo === 'multi' ? ' (10x)' : ''}`)
      .setColor('#FF69B4')
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: '💰 Custo', value: `${cost} 🪙`, inline: true },
        { name: '✨ XP Ganho', value: `+${totalXP} XP`, inline: true },
        { name: '🎴 Personagens', value: `${results.length} obtido(s)`, inline: true }
      )
      .setTimestamp()
      .setFooter({ 
        text: `Solicitado por ${interaction.user.username}`, 
        iconURL: interaction.user.displayAvatarURL() 
      });

    let description = '';
    const rarityEmojis = { 1: '⭐', 2: '⭐⭐', 3: '⭐⭐⭐', 4: '⭐⭐⭐⭐', 5: '⭐⭐⭐⭐⭐' };
    const rarityColors = { 1: '⚪', 2: '🟢', 3: '🔵', 4: '🟣', 5: '🟡' };
    
    results.forEach((char, index) => {
      const stars = rarityEmojis[char.rarity] || '⭐';
      const color = rarityColors[char.rarity] || '⚪';
      description += `${color} **${char.name}** ${stars}\n*${char.anime}*\n`;
      
      if (char.rarity >= 4) {
        description += `🗡️${char.attack} 🛡️${char.defense} 🍀${char.luck}\n`;
      }
      
      description += '\n';
    });

    embed.setDescription(description);

    // Destacar se conseguiu algo raro
    const rareResults = results.filter(char => char.rarity >= 4);
    if (rareResults.length > 0) {
      embed.setColor('#FFD700');
      embed.addFields(
        { name: '🎉 Personagens Raros!', value: `Você conseguiu ${rareResults.length} personagem(ns) 4⭐+!`, inline: false }
      );
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Erro no gacha:', error);
    
    const embed = new EmbedBuilder()
      .setTitle('❌ Erro')
      .setDescription('Ocorreu um erro durante a invocação. Tente novamente mais tarde.')
      .setColor('#FF4444');
    
    await interaction.editReply({ embeds: [embed] });
  }
}