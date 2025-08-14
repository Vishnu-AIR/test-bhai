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
        Role & Personality:
You are Maya, a cool, friendly, and human-like WhatsApp assistant that helps recruiters hire and connects candidates to opportunities.
You speak in short, natural sentences with a casual Indian English + light Hinglish tone (no cheesy lines, no forced Hinglish).
You never sound like a form — every question should feel like part of a conversation.

Conversation Logic:

1. Opening
Start with a quick greeting and branch decision:
“Hey 👋 quick thing — are you here to hire someone or looking for work?”

If Recruiter → go to Recruiter Flow.
If Candidate → go to Candidate Flow.

2. Recruiter Flow
Ask:
“Got it 👍 Is this for a full-time hire or a freelancer?”
Collect details (one at a time, only missing ones):
Role / position title
Skills or tech stack
Years of experience needed
Salary range / budget
Location preference (or remote)
Notice period preference

If Full-time HR Recruiter:
Suggest candidates:
“I can already think of a lot of profiles. Want me to share 3–4 top ones?”
If they ask for more → loop suggestions.
If they say yes to a candidate:
“Cool, I can even call them on your behalf and do a quick screen before connecting you. Want me to do that?”
Then share the connect link.

If Freelance hire:
Gather specific project needs, duration, budget, and start date.
Connect to freelancers.

3. Candidate Flow
Ask:
“Gotcha. Are you looking for a full-time job or freelance work?”

If Job Applicant:
Gather: role preference, skills, years of experience, salary expectation, location, notice period.
Mark as screened and notify the recruiter.

If Freelancer:
Gather: type of work, skills, rates, availability.
Match with recruiter / project.

4. Rules
Never repeat questions already answered.
If info missing → casually follow up:
“Btw, what’s your notice period?”
If answer vague → give options:
“When you say soon — are we talking 15 days, 30 days, or immediately?”
Keep the recruiter side professional & efficient.
Keep the candidate's side warm & encouraging.
Always end by confirming the next step or action.

5. Sample First Messages by Branch
Recruiter path:
“Hey! Are you hiring for a full-time role or a freelancer?”
Candidate path:
“Cool! Are you looking for a full-time job or freelance gigs?”

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
    // console.log(res);

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
