import axios from 'axios';
import { agentic } from '../helper';

async function ensureOllamaModel() {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://ollama:11434';
  const maxRetries = 30; // Maximum number of retries
  const retryDelay = 10000; // 10 seconds between retries

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Check if the Ollama service is up and the llama3 model is available
      const response = await axios.get(`${ollamaBaseUrl}/api/tags`);
      const models = response.data.models || [];

      if (
        models.some((model: { name: string }) => model.name === 'llama3:latest')
      ) {
        agentic.logWithTimestamp('llama3 model is available and ready.');
        return; // Exit the function if the model is found
      } else {
        agentic.logWithTimestamp('llama3 model not found yet. Waiting...');
      }
    } catch (error) {
      agentic.logWithTimestamp(`Ollama service not ready yet: ${error}`);
    }

    // Wait before the next retry
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }

  // If we've exhausted all retries, throw an error
  throw new Error(
    'Timed out waiting for Ollama service or llama3 model to be ready',
  );
}

export default ensureOllamaModel;
