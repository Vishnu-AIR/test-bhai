// JSON schema-like param definitions for tool calls
export const ToolSchemas = {
  fetchPostById: {
    name: "fetchPostById",
    description: "Fetch a sample post by id from an HTTP API",
    parameters: {
      type: "OBJECT",
      properties: {
        id: { type: "NUMBER", description: "Post id (1..100)" }
      },
      required: ["id"]
    }
  },
};
