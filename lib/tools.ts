import { Sun, TrendingUp, Search } from 'lucide-react';

// Define types for our tool results
type WeatherTool = {
  tool: 'get_weather';
  city: string;
  temperature: string;
  condition: string;
};

type StockTool = {
  tool: 'get_stock_price';
  ticker: string;
  price: string;
  change: string;
};

// New type for your hybrid search API result
type HybridSearchTool = {
    tool: 'hybrid_search';
    query: string;
    results: object[]; // Using 'any' for now, can be replaced with a more specific type
};

export type ToolResult = WeatherTool | StockTool | HybridSearchTool;

// This function now handles local simulations and a real API call.
// NOTE: This function is now async. The component that calls it (page.tsx)
// will need to be updated to use `await` when calling this function.
export const simulateToolCall = async (prompt: string): Promise<ToolResult | null> => {
  const lowerCasePrompt = prompt.toLowerCase();

  // --- Local Tool Simulations ---
  if (lowerCasePrompt.startsWith("weather in")) {
    const city = prompt.substring("weather in".length).trim();
    if (!city) return null;
    return {
      tool: "get_weather",
      city: city.charAt(0).toUpperCase() + city.slice(1),
      temperature: `${(Math.random() * 20 + 10).toFixed(1)}°C`,
      condition: ["Sunny", "Cloudy", "Rainy"][Math.floor(Math.random() * 3)],
    };
  }

  if (lowerCasePrompt.startsWith("stock price for")) {
    const ticker = prompt.substring("stock price for".length).trim().toUpperCase();
    if (!ticker) return null;
    return {
      tool: "get_stock_price",
      ticker: ticker,
      price: `$${(Math.random() * 500 + 100).toFixed(2)}`,
      change: `${(Math.random() * 20 - 10).toFixed(2)}%`,
    };
  }
  
  // --- Real API Call for Hybrid Search ---
  if (lowerCasePrompt.startsWith("search for")) {
    const query = prompt.substring("search for".length).trim();
    if (!query) return null;

    try {
        const response = await fetch('http://35.170.249.113:8000/api/v1/hybridsearch', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'x-api-key': 'ok', // For production, use an environment variable
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ prompt: query }),
        });

        if (!response.ok) {
            console.error("API call failed:", response.status, response.statusText);
            // You might want to return a specific error message to the user here
            return null; 
        }

        const data = await response.json();

        return {
            tool: 'hybrid_search',
            query: query,
            // Assuming the API returns an object with a 'candidates' property
            results: data.candidates || data || [], 
        };

    } catch (error) {
        console.error("Failed to fetch from hybrid search API:", error);
        // Handle network errors, etc.
        return null;
    }
  }

  return null;
};

// A component to render the result of a tool call
interface ToolCallResultProps {
  content: ToolResult;
}

export const ToolCallResult: React.FC<ToolCallResultProps> = ({ content }) => {


  if (content.tool === 'hybrid_search') {
    return (
        `<div className="bg-purple-100 border border-purple-300 p-4 rounded-lg shadow-sm text-gray-800">
            <h3 className="font-bold text-lg mb-2 flex items-center">
                <Search className="mr-2 h-5 w-5 text-purple-600" />
                <span>Search Results for: "{content.query}"</span>
            </h3>
            {content.results && content.results.length > 0 ? (
                <ul className="list-disc pl-5 space-y-2 text-sm">
                    {content.results.map((result, index) => (
                        <li key={index} className="bg-purple-50 p-2 rounded">
                            {/* Displaying as a string, adjust as needed based on result structure */}
                            <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-600">No results found.</p>
            )}
        </div>`
    );
  }

  return null;
};
