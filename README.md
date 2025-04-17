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

## Setup Instructions

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

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers. 