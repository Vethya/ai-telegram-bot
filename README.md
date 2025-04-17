# AI Telegram Bot

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-blue.svg)](https://core.telegram.org/bots/api)

A powerful Telegram chatbot powered by AI that provides intelligent responses and assistance to users. Built with Telegraf, and AI SDK.

## Features

- AI-powered conversations using AI SDK
- Real-time message streaming for instant responses
- Image analysis and multi-modal interactions
- Context-aware conversations with persistent chat memory
- User management with whitelist/blacklist capabilities
- Chat context management with context commands
- Message editing support

## Prerequisites

- Node.js (v16 or higher)
- pnpm package manager
- MongoDB instance
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Google Generative AI API Key

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/Vethya/ai-tg-bot.git
   cd ai-tg-bot
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`:
   ```env
   BOT_TOKEN=your_telegram_bot_token
   GOOGLE_AI_API_KEY=your_google_ai_api_key
   MONGODB_URI=your_mongodb_connection_string
   AI_NAME=your_ai_name
   ```

5. Build the project:
   ```bash
   pnpm build
   ```

6. Start the bot:
   ```bash
   pnpm start
   ```

## Development

For development with hot-reloading:
```bash
pnpm dev
```

### Code Style

This project uses ESLint and Prettier for code formatting. To format your code:
```bash
pnpm format
```

To lint your code:
```bash
pnpm lint
```

### Testing

Run tests:
```bash
pnpm test
```

## Production Deployment with PM2

To run the bot in production using PM2:

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Start the bot with PM2:
   ```bash
   pm2 start dist/index.js --name "ai-tg-bot"
   ```

3. Additional PM2 commands:
   ```bash
   # View logs
   pm2 logs ai-tg-bot

   # Monitor the process
   pm2 monit

   # Restart the bot
   pm2 restart ai-tg-bot

   # Stop the bot
   pm2 stop ai-tg-bot

   # Delete the bot from PM2
   pm2 delete ai-tg-bot
   ```

4. To ensure the bot starts automatically on system reboot:
   ```bash
   pm2 startup
   pm2 save
   ```

## Project Structure

```
src/
├── commands/     # Bot commands implementation
├── db/          # Database related code
├── utils/       # Utility functions
├── ai-service.ts # AI service implementation
├── constants.ts  # Project constants
└── index.ts     # Main application entry point
```

## API Documentation

### Bot Commands

- `/start` - Start the bot and get a welcome message
- `/help` - Get help about available commands
- `/clear` - Clear the conversation context
- `/settings` - Configure bot settings
- `/blacklist` - Manage blacklisted users (admin only)
- `/whitelist` - Manage whitelisted users (admin only)

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| BOT_TOKEN | Telegram Bot Token from @BotFather | Yes |
| GOOGLE_AI_API_KEY | Google AI API Key | Yes |
| MONGODB_URI | MongoDB Connection String | Yes |
| AI_NAME | Custom name for your AI assistant | Yes |
| NODE_ENV | Environment (development/production) | No |
| LOG_LEVEL | Logging level (debug/info/warn/error) | No |
| RATE_LIMIT_WINDOW | Rate limiting window in milliseconds | No |
| RATE_LIMIT_MAX_REQUESTS | Maximum requests per window | No |
| ALLOWED_USERS | Comma-separated list of allowed user IDs | No |

## Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check if the bot token is correct
   - Ensure the bot is running (check logs)
   - Verify MongoDB connection

2. **AI responses are slow**
   - Check your internet connection
   - Verify Google AI API key
   - Consider adjusting rate limits

3. **Database connection issues**
   - Verify MongoDB URI
   - Check if MongoDB is running
   - Ensure network connectivity

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Version History

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please:
1. Check the [Troubleshooting](#troubleshooting) section
2. Search existing [issues](https://github.com/Vethya/ai-tg-bot/issues)
3. Open a new issue if needed

## Acknowledgments

- [Telegraf](https://telegraf.js.org/) - Telegram Bot Framework
- [Google AI SDK](https://ai.google.dev/) - AI Integration
- [MongoDB](https://www.mongodb.com/) - Database 