import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const healthRouter = Router();

healthRouter.get("/", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    response.status(200).json({
      status: "ok",
      service: "soma",
      database: "connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    response.status(503).json({
      status: "error",
      service: "soma",
      database: "unavailable",
    });
  }
});

export default healthRouter;