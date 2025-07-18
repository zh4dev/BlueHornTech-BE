import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import AppSetupService from "./services/app-setup-service";

async function main() {
  const app = express();
  const PORT = process.env.PORT;
  const maximumUpload = "20mb";

  // Middleware
  app.use(express.json({ limit: maximumUpload }));
  app.use(express.urlencoded({ extended: true, limit: maximumUpload }));
  app.use(
    cors({
      origin: [
        "https://blue-horn-tech-gc23m563o-zh4devs-projects.vercel.app",
        "http://localhost:5173",
        "http://localhost:3003",
      ],
    })
  );

  // Register routes
  app.use(AppSetupService.getRouter());

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
