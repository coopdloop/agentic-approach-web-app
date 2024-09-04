import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { AgentExecutor } from 'langchain/agents';
import { Namespace } from 'socket.io';
import { EmbeddingStatus } from './types';
import { loadAndEmbedDocuments } from './rag';

export class Agentic {
  private static instance: Agentic;

  public isAgentReady: boolean = false;
  public readonly documentsDirectory: string = './documents';
  agent?: AgentExecutor;
  vectorStore?: PGVectorStore;
  agentNamespace?: Namespace;

  private eventQueue: {
    embeddingStatus: EmbeddingStatus[];
    agentReady: boolean | null;
  } = {
    embeddingStatus: [],
    agentReady: null,
  };

  private constructor() {}

  public static getInstance(): Agentic {
    if (!Agentic.instance) {
      Agentic.instance = new Agentic();
    }
    return Agentic.instance;
  }

  public logWithTimestamp(message: string) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  public queueEvent(
    eventName: 'embeddingStatus' | 'agentReady',
    data: EmbeddingStatus | boolean,
  ): void {
    if (eventName === 'embeddingStatus') {
      this.eventQueue.embeddingStatus.push(data as EmbeddingStatus);
      // Keep only the last 100 events
      if (this.eventQueue.embeddingStatus.length > 100) {
        this.eventQueue.embeddingStatus.shift();
      }
    } else if (eventName === 'agentReady') {
      this.eventQueue.agentReady = data as boolean;
    }
    this.agentNamespace?.emit(eventName, data);
  }

  public getQueuedEvents(): {
    embeddingStatus: EmbeddingStatus[];
    agentReady: boolean | null;
  } {
    return { ...this.eventQueue };
  }

  public setAgentNamespace(namespace: Namespace): void {
    this.agentNamespace = namespace;
  }

  public async handleNewDocument(filename: string): Promise<void> {
    this.logWithTimestamp(`Processing new document: ${filename}`);
    await loadAndEmbedDocuments(
      this.documentsDirectory,
      (filename, status) => {
        this.queueEvent('embeddingStatus', { filename, status });
      },
      filename,
    );
    this.logWithTimestamp(`Finished processing document: ${filename}`);
  }
}

export const agentic = Agentic.getInstance();
