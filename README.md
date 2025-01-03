# Tabby Server 🚀

Tabby Server is the backend component of a Chrome extension that helps users manage their tabs by automatically summarizing and organizing content using AI.

## 🌟 Features

- Tab content processing and summarization using OpenAI's GPT
- Automatic content type classification (articles, tweets, LinkedIn posts, etc.)
- Weekly digest generation and delivery via email and Slack
- RESTful API endpoints for tab management
- Queue-based processing system
- PostgreSQL database for persistent storage

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## 🔑 Environment Variables

Create a `.env` file in the root directory with the following variables:

```
DATABASE_URL="postgresql://username:password@localhost:5432/tabby"
OPENAI_API_KEY="your-openai-api-key"
SENDGRID_API_KEY="your-sendgrid-api-key"
FROM_EMAIL="your-verified-sender@example.com"
NOTIFICATION_EMAIL="recipient@example.com"
SLACK_WEBHOOK_URL="your-slack-webhook-url"
PORT=3000
NODE_ENV="development"
```

## 📦 Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/tabby-server.git
cd tabby-server
```

2. Install dependencies:

```bash
npm install
```

3. Set up the database:

```bash
npx prisma migrate dev
```

4. Start the server:

```bash
npm run dev
```

## 🚀 API Endpoints

### Health Check

- `GET /health`
  - Checks if the server is running
  - Returns: `{ status: "ok", timestamp: "ISO-date", uptime: seconds }`

### Summaries

- `POST /api/summaries`

  - Creates a new summary
  - Body: `{ url, title, type, content }`

- `GET /api/summaries/status`
  - Gets the current processing status
  - Returns counts of pending/completed summaries

### Newsletter

- `POST /api/newsletter/trigger`
  - Triggers the generation and sending of the newsletter

## 🏗️ Project Structure

- `src/routes/`: API routes
- `src/workers/`: Background jobs and processing logic
- `src/lib/`: Utility functions
- `src/prisma/`: Database schema and migrations
- `src/types/`: TypeScript types
- `src/utils/`: Miscellaneous utility functions
- `src/workers/`: Background jobs and processing logic
- `src/routes/`: API routes
- `src/routes/newsletter.js`: Newsletter generation and sending
- `src/workers/newsletter.js`: Newsletter generation and sending logic
- `src/routes/summaries.js`: Summary processing and storage
- `src/workers/summaries.js`: Summary processing and storage logic
- `src/routes/health.js`: Health check endpoint
- `src/routes/newsletter.js`: Newsletter generation and sending
- `src/workers/newsletter.js`: Newsletter generation and sending logic
- `src/routes/summaries.js`: Summary processing and storage
- `src/workers/summaries.js`: Summary processing and storage logic
- `src/routes/health.js`: Health check endpoint

## 🔄 Development Workflow

1. Make changes to the code
2. Update database schema if needed:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```
3. Test your changes locally
4. Deploy using Fly.io:
   ```bash
   fly deploy
   ```

## 🐳 Docker Support

Build the container:

```bash
docker build -t tabby-server .
```

Run the container:

```bash
docker run -d --name tabby-server -p 3000:3000 tabby-server
```

## 📚 Tech Stack

- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI GPT via LangChain
- **Deployment**: Fly.io
- **Notifications**: SendGrid (email) & Slack
- **Rate Limiting**: express-rate-limit

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, please open an issue in the GitHub repository or contact the maintainers.

## 🔮 Future Improvements

- [ ] Add Redis for better queue management
- [ ] Implement user authentication
- [ ] Add more content type classifications
- [ ] Improve error handling and retry mechanisms
- [ ] Add testing suite
- [ ] Add logging
- [ ] Add metrics
- [ ] Add monitoring
- [ ] Add observability
