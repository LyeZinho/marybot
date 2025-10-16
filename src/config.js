export default {
  prefix: "m.",
  token: process.env.DISCORD_TOKEN,
  ownerId: "329720996669947904",
  database: {
    url: process.env.DATABASE_URL || "postgresql://botuser:botpass@localhost:5433/marybot"
  },
  colors: {
    primary: 0x5865f2,
    success: 0x00ff00,
    error: 0xff0000,
    warning: 0xffff00
  },
  emojis: {
    ping: "🏓",
    help: "📚",
    success: "✅",
    error: "❌",
    warning: "⚠️",
    loading: "⏳"
  }
};