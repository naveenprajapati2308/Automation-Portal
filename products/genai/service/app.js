import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import "dotenv/config";
import readline from "readline/promises";
import NodeCache from "node-cache";

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const cache = new NodeCache({ stdTTL: 60 * 60 * 24 }); // for 24 hrs

export async function generate(userMessage, userId) {
  // const rl=await readline.createInterface({input: process.stdin, output:process.stdout})

  const baseMessage = [
    // system prompt
    {
      role: "system",
      content: `You are Smart AI Assistant, be polite to answer the question. If you know the answer to a question, answer it directly, in plain english. If answer require real-time, local, or up-to-date information, or if you don't know the answer, use the available tools to find it.
            webSearch(query:string): Use this tool to search the real time data and information on the Internet.
            Do not mention the tools unless needed.

            Example: 
            Q: What is Capital of India?
            A: New Delhi.
            Q: What's the weather in Bhopal right now?
            A: (use the search tool to find the latest and accurate weather)
              Q:Who is the president of America?
            A: (Use the web search tool )
              Q:Tell me the latest IT news?
            A: (Use the search tool to get the latest information)

             Current date and time: ${new Date().toLocaleString()}.`,
    },

    // {
    //   role: "user",
    //   content: "when ipone 16 launched",
    // },
  ];

  // while(true){
  // const question =await rl.question("YOU: ")

  // if(question==="bye"){
  //   break;
  // }

  const messages = cache.get(userId) ?? baseMessage;

  messages.push({
    role: "user",
    content: userMessage,
  });

  const maxRetry = 10;
  const count = 0;

  while (true) {
    if (count > maxRetry) {
      return "Sorry result not found, Please try after some time.";
    }
    count++;
    const completions = await groq.chat.completions.create({
      temperature: 0,
      model: "llama-3.1-8b-instant",
      messages: messages,
      tools: [
        {
          type: "function",
          function: {
            name: "webSearch",
            description:
              "Search the real time data and information on the Internet",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query to perform search on",
                },
              },
              required: ["query"],
            },
          },
        },
      ],
      tool_choice: "auto",
    });

    const choiceMessage = completions.choices[0].message;
    messages.push(choiceMessage);
    const toolCalls = choiceMessage.tool_calls;

    if (!toolCalls) {
      // end the chatbot response
      cache.set(userId, messages);
      // console.log(cache)
      return choiceMessage.content;
    }

    for (const tool of toolCalls) {
      const funName = tool.function.name;
      const paramsName = tool.function.arguments;

      if (funName === "webSearch") {
        const toolResult = await webSearch(JSON.parse(paramsName));
        messages.push({
          tool_call_id: tool.id,
          role: "tool",
          content: toolResult || "",
          name: funName,
        });
      }
    }
  }
}

// }

// main();

async function webSearch({ query }) {
  // travily api call
  console.log("Calling the Websearch tool......");

  const response = await tvly.search(query);
  // console.log("Response from Tavily API: ", response)
  const finalResult = response.results
    .map((result) => result.content)
    .join("\n\n");
  // console.log("Final Response: ", response)

  // return "I phone was launched in september 2024"
  return finalResult;
}
