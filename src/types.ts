export interface EmbeddingStatus {
  filename: string;
  status: 'embedding' | 'embedded';
}

export interface EventQueue {
  embeddingStatus: EmbeddingStatus[];
  agentReady: boolean | null;
}

export const eventQueue: EventQueue = {
  embeddingStatus: [],
  agentReady: null,
};
