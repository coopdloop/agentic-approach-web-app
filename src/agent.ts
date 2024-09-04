import ensureOllamaModel from './validators/llama3';
import { createAgent, checkAndUpdateEmbeddings } from './rag';
import { agentic } from './helper';
import { OllamaEmbeddings } from '@langchain/ollama';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { config } from './config';

const embeddings = new OllamaEmbeddings({
  baseUrl: process.env.OLLAMA_BASE_URL || 'ollama',
  model: process.env.OLLAMA_MODEL || 'llama3',
});

async function initializeAgent() {
  agentic.logWithTimestamp('Starting agent initialization...');
  await ensureOllamaModel();
  const vectorStore = await PGVectorStore.initialize(embeddings, config);
  agentic.vectorStore = vectorStore;
  agentic.agent = await createAgent(agentic.vectorStore);
  checkAndUpdateEmbeddings(agentic.documentsDirectory, (filename, status) => {
    agentic.queueEvent('embeddingStatus', { filename, status });
  });
  agentic.isAgentReady = true;
  agentic.queueEvent('agentReady', true);
  agentic.logWithTimestamp(
    'Agent initialization complete. Emitting agentReady...',
  );
}

export default initializeAgent;
