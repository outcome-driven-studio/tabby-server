import Queue from "bull";
import Redis from "ioredis";

const REDIS_URL = process.env.UPSTASH_REDIS_URL;

if (!REDIS_URL) {
  console.error("Redis connection URL is not defined");
  process.exit(1);
}

// Create Redis client with custom configuration
const redisClient = new Redis(REDIS_URL, {
  tls: { rejectUnauthorized: false },
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = "READONLY";
    return err.message.includes(targetError);
  },
});

// Create Bull queue with custom Redis client
export const summaryQueue = new Queue("summary-processing", {
  createClient: (type) => {
    switch (type) {
      case "client":
        return redisClient;
      case "subscriber":
        return redisClient.duplicate();
      case "bclient":
        return redisClient.duplicate();
      default:
        return redisClient;
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

// Add error handlers with more detailed logging
summaryQueue.on("error", function (error) {
  console.error("Queue error:", {
    message: error.message,
    stack: error.stack,
    code: error.code,
  });
});

summaryQueue.on("failed", function (job, error) {
  console.error("Job failed:", {
    jobId: job.id,
    error: error.message,
    stack: error.stack,
  });
});

// Add connection status logging
redisClient.on("connect", function () {
  console.log("Redis client connected successfully");
});

redisClient.on("error", function (error) {
  console.error("Redis client error:", {
    message: error.message,
    stack: error.stack,
    code: error.code,
  });
});
