export class GeminiHelper {
    static async callWithRetry(model, prompt, maxRetries = 3) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await model.generateContent(prompt);
          return result;
        } catch (error) {
          const isRetryableError = error.message.includes('503') ||
                                   error.message.includes('high demand') ||
                                   error.message.includes('rate limit') ||
                                   error.message.includes('429'); // Rate limit

          if (isRetryableError && attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            console.log(`⏳ Gemini API busy, retrying in ${waitTime/1000}s... (${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            throw error; // Non-retryable or final attempt
          }
        }
      }
    }
}
