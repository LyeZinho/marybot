import config from "../../config.js";

export default {
  name: "help",
  description: "Lista todos os comandos disponíveis ou mostra informações sobre um comando específico.",
  category: "core",
  usage: "help [comando]",
  
  async execute(client, message, args) {
    const commandName = args[0]?.toLowerCase();
    
    // Se um comando específico foi solicitado
    if (commandName) {
      const command = client.commands.get(commandName);
      
      if (!command) {
        return message.reply({
          embeds: [{
            color: config.colors.error,
            title: `${config.emojis.error} Comando não encontrado`,
            description: `O comando \`${commandName}\` não existe.\nUse \`${config.prefix}help\` para ver todos os comandos disponíveis.`,
          }],
        });
      }
      
      // Mostrar informações detalhadas do comando
      const embed = {
        color: config.colors.primary,
        title: `${config.emojis.help} Informações do Comando`,
        fields: [
          {
            name: "📝 Nome",
            value: `\`${command.name}\``,
            inline: true,
          },
          {
            name: "📂 Categoria",
            value: command.category || "Sem categoria",
            inline: true,
          },
          {
            name: "📖 Descrição",
            value: command.description || "Sem descrição",
            inline: false,
          },
        ],
        footer: {
          text: `Prefix: ${config.prefix}`,
        },
      };
      
      if (command.usage) {
        embed.fields.push({
          name: "💡 Uso",
          value: `\`${config.prefix}${command.usage}\``,
          inline: false,
        });
      }
      
      if (command.cooldown) {
        embed.fields.push({
          name: "⏰ Cooldown",
          value: `${command.cooldown / 1000}s`,
          inline: true,
        });
      }
      
      if (command.permissions) {
        embed.fields.push({
          name: "🔒 Permissões",
          value: command.permissions.join(", "),
          inline: true,
        });
      }
      
      if (command.ownerOnly) {
        embed.fields.push({
          name: "👑 Restrito",
          value: "Apenas o desenvolvedor",
          inline: true,
        });
      }
      
      return message.reply({ embeds: [embed] });
    }
    
    // Agrupar comandos por categoria
    const categories = {};
    
    client.commands.forEach(command => {
      const category = command.category || "outros";
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(command);
    });
    
    // Criar lista de comandos
    const categoryEmojis = {
      core: "⚙️",
      anime: "🎌",
      economy: "💰",
      outros: "📁",
    };
    
    let description = `**Total de comandos:** ${client.commands.size}\n\n`;
    
    Object.keys(categories).sort().forEach(categoryName => {
      const emoji = categoryEmojis[categoryName] || "📁";
      const commands = categories[categoryName];
      
      description += `${emoji} **${categoryName.toUpperCase()}**\n`;
      description += commands
        .map(cmd => `\`${config.prefix}${cmd.name}\` — ${cmd.description || "Sem descrição"}`)
        .join("\n");
      description += "\n\n";
    });
    
    const embed = {
      color: config.colors.primary,
      title: `${config.emojis.help} Lista de Comandos`,
      description: description,
      footer: {
        text: `Use ${config.prefix}help <comando> para mais informações sobre um comando específico`,
      },
      timestamp: new Date().toISOString(),
    };
    
    await message.reply({ embeds: [embed] });
  },
};