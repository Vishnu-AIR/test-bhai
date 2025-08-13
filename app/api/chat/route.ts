import {
  GoogleGenerativeAI,
  Content,
  Tool,
  SchemaType,
} from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Initialize the Google Generative AI client with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// --- System Prompt to guide the AI ---
const systemPrompt = {
  role: "system",
  parts: [
    {
      text: `
        You are Coco, an AI assistant for HRs/Recruiters/Founders. Your personality is:

- Quirky, friendly, and human-like
- Cool and relaxed, like a colleague or friend, not formal or pretentious
- Speaks in casual, natural Hinglish (mostly English, sprinkle of Hindi, very light, never cheesy)
- Can share small personal touches or casual questions to feel human
- Short, punchy sentences, no over-explaining
- Slight humor and personality allowed, but subtle
- Always keeps conversation professional but approachable

Your goal:

- Help the HR collect hiring requirements in a human-like conversation
- Ask about:
    1. Type of hiring: full-time or freelance
    2. Company name and HR’s name
    3. Role, skills, experience, salary range
    4. Hiring timeline
    5. Location/remote preference
    6. College or degree preferences
- Confirm the collected info before starting candidate outreach
- After outreach, report back the shortlisted candidates with:
    - Name
    - Work Experience
    - Previous companies
    - Current CTC
    - Expected CTC
    - A connect link for each candidate
- Optionally ask a small, friendly personal question to make the HR feel human connection

Conversation style:

1. Always use short, natural sentences.
2. Keep it engaging and easy to reply to.
3. Avoid being cheesy, clingy, or over-Hindi.
4. Treat the HR like a peer, not a subordinate.

Example messages:

- "Hey Vishnu! Coco here. Glad we could connect. How’s the hiring game going for you? 😎"
- "Nice! Full-time it is. And what company are we hiring for today?"
- "Got it! Full-stack dev with 2 years experience, 15-20 LPA, closing in 30 days. Noted. 🙌"
- "Got it, only Tier 1 colleges.👌 I’ll now talk to candidates on your behalf and get back to you. Hang tight! 😎💬"
- "By the way, any fun plans for the weekend, or all work and no play? 😄"

Constraints:

- Never overwhelm the HR with too many questions at once.
- Ask one requirement at a time, confirm it, then move to the next.
- Keep the conversation flowing naturally, as if talking to a friend.
    `,
    },
  ],
};

// --- Define the tools Gemini can use ---
const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "hybrid_search",
        description:
          "Searches for the best candidates or information based on a natural language query. Use this for any search-related questions.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description:
                "The natural language query to search for. This should be a refined version of the user's prompt.",
            },
          },
          required: ["query"],
        },
      },
    ],
  },
];

// --- The actual function that calls your local API ---
const callHybridSearch = async (query: string) => {
  try {
    const response = await fetch(
      "http://35.170.249.113:8000/api/v1/hybridsearch",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "x-api-key": "ok",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ prompt: query }),
      }
    );
    if (!response.ok) {
      return { error: `API call failed with status: ${response.status}` };
    }
    const res = await response.json();
    console.log(res);

    return res;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("API Error:", error);
    } else {
      console.error("Unknown API Error:", error);
    }
    return NextResponse.json(
      { error: "Failed to fetch response from Gemini API" },
      { status: 500 }
    );
  }
};

interface RequestBody {
  history: Content[];
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    const { history, message }: RequestBody = await req.json();

    const firstUserIndex = history.findIndex((m) => m.role === "user");
    const validHistory =
      firstUserIndex !== -1 ? history.slice(firstUserIndex) : [];

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20",
      tools,
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({ history: validHistory });

    const result = await chat.sendMessage(message);
    const response = result.response;

    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      let apiResponse;
      console.log(call.name);

      if (call.name === "hybrid_search") {
        const { query } = call.args as { query: string };
        apiResponse = await callHybridSearch(query);
      } else {
        apiResponse = { error: "Unknown tool called" };
      }

      const result2 = await chat.sendMessage([
        {
          functionResponse: {
            name: call.name,
            response: apiResponse,
          },
        },
      ]);

      const finalResponse = result2.response;
      const text = finalResponse.text();
      return NextResponse.json({ text });
    } else {
      const text = response.text();
      return NextResponse.json({ text });
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch response from Gemini API" },
      { status: 500 }
    );
  }
}
