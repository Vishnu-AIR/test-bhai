import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "node:fs";
import path from "node:path";

const apiKey = process.env.GEMINI_API_KEY!;
if (!apiKey) throw new Error("GEMINI_API_KEY missing in env");

export const genAI = new GoogleGenerativeAI(apiKey);

export function readSystemPrompt() {
  const p = path.join(process.cwd(), "prompts", "system.txt");
  return fs.readFileSync(p, "utf8");
}
