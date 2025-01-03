// src/db.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  // datasources: {
  //   db: {
  //     url: process.env.DATABASE_URL,
  //   },
  // },
  log: [
    { level: "warn", emit: "stdout" },
    { level: "error", emit: "stdout" },
    { level: "info", emit: "stdout" },
  ],
});

// Middleware to log queries in development
if (process.env.NODE_ENV !== "production") {
  prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();
    console.log(
      `Query ${params.model}.${params.action} took ${after - before}ms`
    );
    return result;
  });
}

// Handle connection errors
prisma
  .$connect()
  .then(() => {
    console.log("Successfully connected to database");
  })
  .catch((error) => {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  });

// Handle shutdown gracefully
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
