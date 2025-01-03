import Queue from "bull";

const REDIS_URL = process.env.UPSTASH_REDIS_URL;

export const summaryQueue = new Queue("summary-processing", REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000, // Initial delay of 1 second
    },
    removeOnComplete: true, // Remove jobs from the queue once they're completed
    removeOnFail: false, // Keep failed jobs for investigation
  },
});
