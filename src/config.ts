import { PoolConfig } from 'pg';
import { OllamaEmbeddings } from '@langchain/ollama';
import { DistanceStrategy } from '@langchain/community/vectorstores/pgvector';

const config = {
  postgresConnectionOptions: {
    type: 'postgres',
    host: process.env.DB_HOST || 'db', // Update this if your Postgres instance is not local
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'myuser', // Update with your Postgres username
    password: process.env.DB_PASSWORD || 'ChangeMe', // Update with your Postgres password
    database: process.env.DB_DATABASE || 'api', // Update with your database name
  } as PoolConfig,
  tableName: 'cybersecurity_embeddings',
  columns: {
    idColumnName: 'id',
    vectorColumnName: 'vector',
    contentColumnName: 'content',
    metadataColumnName: 'metadata',
  },
  distanceStrategy: 'cosine' as DistanceStrategy,
};

const embeddings = new OllamaEmbeddings({
  model: process.env.OLLAMA_MODEL || 'llama3',
});

export { embeddings, config };
