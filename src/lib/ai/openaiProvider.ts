import OpenAI from "openai";

const TIMEOUT_MS = 15000; // 15-second bounded timeout

export async function generateWithAstra(prompt: string): Promise<{ success: boolean; data?: any; error?: any; latencyMs: number }> {
  const startTime = Date.now();

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: { code: "CONFIGURATION_ERROR", message: "OPENAI_API_KEY is not configured on the server." },
        latencyMs: Date.now() - startTime
      };
    }

    const openai = new OpenAI({ apiKey, timeout: TIMEOUT_MS });

    const completion = await openai.chat.completions.create({
      model: "gpt-6-astra",
      messages: [{ role: "user", content: prompt }],
      // @ts-ignore - Temporary ignore if official types aren't fully updated for Astra reasoning parameters
      reasoning: { effort: "low" }
    });

    return {
      success: true,
      data: {
        output_text: completion.choices[0]?.message?.content || "",
      },
      latencyMs: Date.now() - startTime
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    
    // Default safe error mapping
    let code = "UNKNOWN_ERROR";
    let message = "An unexpected error occurred communicating with OpenAI.";

    if (error?.name === 'APITimeoutError' || error?.code === 'ETIMEDOUT' || error?.code === 'ECONNABORTED') {
      code = "TIMEOUT";
      message = "The request to Astra exceeded the configured timeout.";
    } else if (error instanceof OpenAI.APIError) {
      switch (error.status) {
        case 401:
          code = "AUTHENTICATION_ERROR";
          message = "Authentication with OpenAI failed.";
          break;
        case 429:
          code = "RATE_LIMITED";
          message = "OpenAI rate limit exceeded.";
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          code = "MODEL_ERROR";
          message = "OpenAI model/service error.";
          break;
        default:
          code = "NETWORK_ERROR";
          message = "Failed to communicate with OpenAI API.";
      }
    } else if (error?.message?.includes("fetch") || error?.message?.includes("network")) {
       code = "NETWORK_ERROR";
       message = "A network error occurred while reaching OpenAI.";
    }

    return {
      success: false,
      error: { code, message },
      latencyMs
    };
  }
}
