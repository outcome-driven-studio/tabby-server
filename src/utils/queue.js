import Queue from "bull";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.error("Redis URL is not defined");
  process.exit(1);
}

// Create Bull queue with direct Redis URL
export const summaryQueue = new Queue("summary-processing", REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
  redis: {
    tls: { rejectUnauthorized: false },
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    retryStrategy(times) {
      console.log(`Retry attempt ${times}`);
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  },
});

// Create a separate Redis client for health checks
export const redisClient = new Redis(REDIS_URL, {
  tls: { rejectUnauthorized: false },
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  retryStrategy(times) {
    console.log(`Retry attempt ${times}`);
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Add connection event handlers
redisClient.on("connect", () => {
  console.log("Redis client connected successfully", {
    timestamp: new Date().toISOString(),
  });
});

redisClient.on("error", (error) => {
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
