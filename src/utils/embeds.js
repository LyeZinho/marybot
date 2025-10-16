import config from "../config.js";

// Classe para criar embeds padronizados
export class EmbedBuilder {
  constructor() {
    this.data = {
      color: config.colors.primary,
      timestamp: new Date().toISOString(),
    };
  }

  setTitle(title) {
    this.data.title = title;
    return this;
  }

  setDescription(description) {
    this.data.description = description;
    return this;
  }

  setColor(color) {
    this.data.color = color;
    return this;
  }

  setFooter(text, iconURL = null) {
    this.data.footer = { text };
    if (iconURL) this.data.footer.icon_url = iconURL;
    return this;
  }

  setThumbnail(url) {
    this.data.thumbnail = { url };
    return this;
  }

  setImage(url) {
    this.data.image = { url };
    return this;
  }

  addField(name, value, inline = false) {
    if (!this.data.fields) this.data.fields = [];
    this.data.fields.push({ name, value, inline });
    return this;
  }

  setAuthor(name, iconURL = null, url = null) {
    this.data.author = { name };
    if (iconURL) this.data.author.icon_url = iconURL;
    if (url) this.data.author.url = url;
    return this;
  }

  build() {
    return this.data;
  }
}

// Funções de conveniência para embeds comuns
export const createSuccessEmbed = (title, description) => {
  return new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle(`${config.emojis.success} ${title}`)
    .setDescription(description)
    .build();
};

export const createErrorEmbed = (title, description) => {
  return new EmbedBuilder()
    .setColor(config.colors.error)
    .setTitle(`${config.emojis.error} ${title}`)
    .setDescription(description)
    .build();
};

export const createWarningEmbed = (title, description) => {
  return new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle(`${config.emojis.warning} ${title}`)
    .setDescription(description)
    .build();
};

export const createInfoEmbed = (title, description) => {
  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(title)
    .setDescription(description)
    .build();
};