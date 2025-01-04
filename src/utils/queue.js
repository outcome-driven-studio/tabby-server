import Queue from "bull";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.error("Redis URL is not defined");
  process.exit(1);
}

// Create a single Redis client instance
const client = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  retryStrategy(times) {
    console.log(`Retry attempt ${times}`);
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  tls: { rejectUnauthorized: false },
});

// Create Bull queue using the Redis client
export const summaryQueue = new Queue("summary-processing", {
  createClient: (type) => {
    switch (type) {
      case "client":
        return client;
      case "subscriber":
        return new Redis(REDIS_URL, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
          tls: { rejectUnauthorized: false },
        });
      case "bclient":
        return new Redis(REDIS_URL, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
          tls: { rejectUnauthorized: false },
        });
      default:
        return client;
    }
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Export client for health checks
export const redisClient = client;

// Add connection event handlers
client.on("connect", () => {
  console.log("Redis client connected successfully", {
    timestamp: new Date().toISOString(),
  });
});

client.on("error", (error) => {
  console.error("Redis client error:", {
    message: error.message,
    stack: error.stack,
    code: error.code,
    timestamp: new Date().toISOString(),
  });
});

// Add queue error handlers
summaryQueue.on("error", function (error) {
  console.error("Queue error:", {
    message: error.message,
    stack: error.stack,
    code: error.code,
    timestamp: new Date().toISOString(),
  });
});
