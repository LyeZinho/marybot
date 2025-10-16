import config from "../../config.js";

export default {
  name: "help",
  aliases: ["ajuda", "h", "commands"],
  description: "Mostra todos os comandos disponíveis ou informações sobre um comando específico com paginação.",
  category: "core",
  usage: "help [comando] [página]",
  cooldown: 3000,
  
  async execute(client, message, args) {
    try {
      // Se um comando específico foi solicitado
      if (args.length > 0 && isNaN(args[0])) {
        const commandName = args[0].toLowerCase();
        const command = client.commands.get(commandName) || 
                       client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        
        if (!command) {
          const embed = {
            color: config.colors.error,
            title: `${config.emojis.error} Comando não encontrado`,
            description: `O comando **${commandName}** não existe.\n\nUse \`${config.prefix}help\` para ver todos os comandos disponíveis.`,
          };
          return await message.reply({ embeds: [embed] });
        }
        
        // Mostrar informações detalhadas do comando
        const embed = {
          color: config.colors.primary,
          title: `${config.emojis.info} Comando: ${command.name}`,
          fields: [
            {
              name: "📝 Descrição",
              value: command.description || "Sem descrição disponível",
              inline: false,
            },
            {
              name: "💬 Uso",
              value: `\`${config.prefix}${command.usage || command.name}\``,
              inline: true,
            },
            {
              name: "📂 Categoria",
              value: command.category || "Core",
              inline: true,
            },
            {
              name: "⏱️ Cooldown",
              value: `${(command.cooldown || 0) / 1000}s`,
              inline: true,
            },
          ],
        };
        
        if (command.aliases && command.aliases.length > 0) {
          embed.fields.push({
            name: "🔗 Aliases",
            value: command.aliases.map(alias => `\`${alias}\``).join(", "),
            inline: false,
          });
        }
        
        if (command.permissions) {
          embed.fields.push({
            name: "🔒 Permissões",
            value: command.permissions.join(", "),
            inline: false,
          });
        }
        
        if (command.ownerOnly) {
          embed.fields.push({
            name: "👑 Restrito",
            value: "Apenas o desenvolvedor",
            inline: false,
          });
        }
        
        return await message.reply({ embeds: [embed] });
      }
      
      // Parse da página
      const page = parseInt(args[0]) || 1;
      
      // Mostrar lista de todos os comandos com paginação
      const categories = this.organizeCommandsByCategory(client.commands);
      const categoriesPerPage = 2; // Reduzir para 2 categorias por página para melhor legibilidade
      const totalCategories = Object.keys(categories).length;
      const totalPages = Math.ceil(totalCategories / categoriesPerPage);
      
      if (page < 1 || page > totalPages) {
        const embed = {
          color: config.colors.warning,
          title: `${config.emojis.warning} Página Inválida`,
          description: `A página deve estar entre 1 e ${totalPages}.\n\nUse \`${config.prefix}help\` sem argumentos para ver a primeira página.`,
        };
        return await message.reply({ embeds: [embed] });
      }
      
      const embed = this.createPaginatedHelpEmbed(categories, page, totalPages, categoriesPerPage);
      const sentMessage = await message.reply({ embeds: [embed] });
      
      // Adicionar reações para navegação se houver múltiplas páginas
      if (totalPages > 1) {
        try {
          await sentMessage.react('⬅️');
          await sentMessage.react('➡️');
          await sentMessage.react('📋'); // Para mostrar índice
          
          // Collector para navegação
          const filter = (reaction, user) => {
            return ['⬅️', '➡️', '📋'].includes(reaction.emoji.name) && user.id === message.author.id && !user.bot;
          };
          
          const collector = sentMessage.createReactionCollector({ filter, time: 300000 }); // 5 minutos
          
          let currentPage = page;
          
          collector.on('collect', async (reaction, user) => {
            try {
              if (reaction.emoji.name === '⬅️' && currentPage > 1) {
                currentPage--;
                const newEmbed = this.createPaginatedHelpEmbed(categories, currentPage, totalPages, categoriesPerPage);
                await sentMessage.edit({ embeds: [newEmbed] });
              } else if (reaction.emoji.name === '➡️' && currentPage < totalPages) {
                currentPage++;
                const newEmbed = this.createPaginatedHelpEmbed(categories, currentPage, totalPages, categoriesPerPage);
                await sentMessage.edit({ embeds: [newEmbed] });
              } else if (reaction.emoji.name === '📋') {
                // Mostrar índice de categorias
                const indexEmbed = this.createCategoryIndexEmbed(categories, totalPages);
                await sentMessage.edit({ embeds: [indexEmbed] });
                
                // Voltar para a página atual após 10 segundos
                setTimeout(async () => {
                  try {
                    const originalEmbed = this.createPaginatedHelpEmbed(categories, currentPage, totalPages, categoriesPerPage);
                    await sentMessage.edit({ embeds: [originalEmbed] });
                  } catch (error) {
                    console.log('Erro ao voltar ao embed original:', error.message);
                  }
                }, 10000);
              }
              
              // Remover reação do usuário
              try {
                await reaction.users.remove(user.id);
              } catch (error) {
                // Falha silenciosa se não tiver permissão para remover reações
                console.log('Sem permissão para remover reação do usuário');
              }
            } catch (error) {
              console.error('Erro ao processar reação:', error);
            }
          });
          
          collector.on('end', () => {
            // Tentar remover todas as reações ao final
            sentMessage.reactions.removeAll().catch(() => {
              console.log('Sem permissão para remover todas as reações');
            });
          });
          
        } catch (error) {
          console.error('Erro ao adicionar reações:', error);
          // Se não conseguir adicionar reações, ainda funciona com comandos de texto
          console.log('Paginação funcionará apenas via comandos de texto (m.help 2, etc.)');
        }
      }
      
    } catch (error) {
      console.error("Erro no comando help:", error);
      
      const errorEmbed = {
        color: config.colors.error,
        title: `${config.emojis.error} Erro`,
        description: "Ocorreu um erro ao mostrar a ajuda. Tente novamente.",
      };
      
      await message.reply({ embeds: [errorEmbed] });
    }
  },
  
  organizeCommandsByCategory(commands) {
    const categories = {};
    
    commands.forEach(command => {
      const category = command.category || "outros";
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(command);
    });
    
    // Ordenar comandos dentro de cada categoria
    Object.keys(categories).forEach(category => {
      categories[category].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    return categories;
  },
  
  createPaginatedHelpEmbed(categories, page, totalPages, categoriesPerPage) {
    const categoryEntries = Object.entries(categories);
    const startIndex = (page - 1) * categoriesPerPage;
    const endIndex = startIndex + categoriesPerPage;
    const currentCategories = categoryEntries.slice(startIndex, endIndex);
    
    const totalCommands = Object.values(categories).flat().length;
    
    const embed = {
      color: config.colors.primary,
      title: `${config.emojis.help} Central de Ajuda - MaryBot`,
      description: [
        `Use \`${config.prefix}help [comando]\` para informações detalhadas sobre um comando específico.`,
        `Use \`${config.prefix}help [página]\` para navegar entre páginas.`,
        ``,
        `**🏰 Comandos Principais**: \`dungeon\`, \`inv\`, \`equip\`, \`stats\`, \`loot\`, \`shop\``
      ].join('\n'),
      fields: [],
      footer: {
        text: `Página ${page}/${totalPages} • Total: ${totalCommands} comandos • Use ⬅️➡️ para navegar`,
      },
      timestamp: new Date().toISOString(),
    };
    
    // Adicionar cada categoria da página atual
    currentCategories.forEach(([categoryName, commands]) => {
      const categoryEmoji = this.getCategoryEmoji(categoryName);
      
      // Mostrar todos os comandos sem abreviação
      const commandList = commands
        .map(cmd => `\`${cmd.name}\``)
        .join(", ");
      
      embed.fields.push({
        name: `${categoryEmoji} ${categoryName.toUpperCase()} (${commands.length} comandos)`,
        value: commandList,
        inline: false,
      });
    });
    
    // Adicionar field com informações úteis apenas na primeira página
    if (page === 1) {
      embed.fields.push({
        name: "💡 Começando no MaryBot",
        value: [
          `• \`${config.prefix}dungeon start\` - Inicie sua aventura`,
          `• \`${config.prefix}daily\` - Colete moedas diárias`,
          `• \`${config.prefix}profile\` - Veja seu perfil`,
          `• \`${config.prefix}help <comando>\` - Ajuda específica`
        ].join('\n'),
        inline: false,
      });
    } else {
      // Nas outras páginas, mostrar dicas de navegação
      embed.fields.push({
        name: "🧭 Navegação",
        value: [
          `• Use ⬅️ ➡️ para navegar entre páginas`,
          `• Use 📋 para ver o índice completo`,
          `• Use \`${config.prefix}help <comando>\` para detalhes`,
          `• Use \`${config.prefix}help 1\` para voltar ao início`
        ].join('\n'),
        inline: false,
      });
    }
    
    return embed;
  },
  
  createCategoryIndexEmbed(categories, totalPages) {
    const embed = {
      color: config.colors.primary,
      title: `📋 Índice Completo de Categorias`,
      description: "Visão geral de todas as categorias de comandos disponíveis no MaryBot:",
      fields: [],
      footer: {
        text: `Voltando para a ajuda principal em 10 segundos...`,
      },
      timestamp: new Date().toISOString(),
    };
    
    Object.entries(categories).forEach(([categoryName, commands], index) => {
      const categoryEmoji = this.getCategoryEmoji(categoryName);
      const commandCount = commands.length;
      const topCommands = commands.slice(0, 4).map(cmd => cmd.name).join(", ");
      
      embed.fields.push({
        name: `${categoryEmoji} ${categoryName.toUpperCase()}`,
        value: `**${commandCount} comandos**\nDestaque: ${topCommands}${commandCount > 4 ? '...' : ''}`,
        inline: true,
      });
    });
    
    return embed;
  },
  
  getCategoryEmoji(category) {
    const emojis = {
      "core": "⚙️",
      "dungeon": "🏰",
      "anime": "🎌",
      "economy": "💰",
      "admin": "🛠️",
      "fun": "🎮",
      "utility": "🔧",
      "outros": "📁",
    };
    
    return emojis[category.toLowerCase()] || "📁";
  },
};