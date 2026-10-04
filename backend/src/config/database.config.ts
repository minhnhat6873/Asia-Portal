import mongoose from "mongoose";

export async function connectDatabase(): Promise<void> {
  const databaseUrl = process.env.DATABASE?.trim();

  if (!databaseUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE is required in production.");
    }

    console.warn("DATABASE is not configured; development will run without MongoDB.");
    return;
  }

  await mongoose.connect(databaseUrl);
  console.log("MongoDB connected successfully.");
}
