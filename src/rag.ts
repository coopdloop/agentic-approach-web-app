import { Ollama } from '@langchain/ollama';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import { Tool } from '@langchain/core/tools';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import * as path from 'path';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import fs from 'fs/promises';
import { agentic } from './helper';
import { PoolClient } from 'pg';
const isVerbose = process.env.VERBOSE === 'true';
import { Document } from 'langchain/document';

// Function to load and embed documents
async function loadAndEmbedDocuments(
  directory: string,
  statusCallback: (filename: string, status: 'embedding' | 'embedded') => void,
  filename?: string,
): Promise<void> {
  const files = filename ? [filename] : await fs.readdir(directory);
  //
  for (const file of files) {
    if (!(await isFileEmbedded(file))) {
      statusCallback(file, 'embedding');
      try {
        let loader;
        const filePath = path.join(directory, file);

        if (file.endsWith('.pdf')) {
          loader = new PDFLoader(filePath);
        } else if (file.endsWith('.txt')) {
          loader = new TextLoader(filePath);
        } else if (file.endsWith('.docx')) {
          loader = new DocxLoader(filePath);
        } else {
          throw new Error('Unsupported file type');
        }

        const docs = await loader.load();

        for (const doc of docs) {
          await embedDocument(file, doc.pageContent);
        }

        // const textSplitter = new RecursiveCharacterTextSplitter({
        //   chunkSize: 1000,
        //   chunkOverlap: 200,
        // });
        // const splitDocs = await textSplitter.splitDocuments(docs);

        // await agentic.vectorStore?.addDocuments(splitDocs);

        statusCallback(file, 'embedded');
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    } else {
      agentic.logWithTimestamp(`File ${file} is already embedded. Skipping.`);
      statusCallback(file, 'embedded');
    }
  }
}

async function embedDocument(filename: string, content: string): Promise<void> {
  if (!agentic.vectorStore) {
    throw new Error('Vector store is not initialized');
  }

  const doc = new Document({
    pageContent: content,
    metadata: { filename: filename },
  });

  await agentic.vectorStore.addDocuments([doc]);
}

async function checkAndUpdateEmbeddings(
  directory: string,
  statusCallback: (filename: string, status: 'embedding' | 'embedded') => void,
): Promise<void> {
  const files = await fs.readdir(directory);
  for (const file of files) {
    if (!(await isFileEmbedded(file))) {
      agentic.logWithTimestamp(
        `File ${file} was not found in vectory database. Feel free to embed it.`,
      );
    } else {
      agentic.logWithTimestamp(`File ${file} is already embedded. Skipping.`);
      statusCallback(file, 'embedded');
    }
  }
}

async function isFileEmbedded(filename: string): Promise<boolean> {
  if (!agentic.vectorStore) {
    throw new Error('Vector store is not initialized');
  }

  let client: PoolClient | null = null;
  try {
    // Assuming agentic.vectorStore has a pool property for database connections
    client = await agentic.vectorStore.pool.connect();

    // Query to check if any entries with the given filename exist
    agentic.logWithTimestamp(
      `Querying ${agentic.vectorStore.tableName} For ${filename}`,
    );
    const query = `
            SELECT EXISTS (
                SELECT 1
                FROM ${agentic.vectorStore.tableName}
                WHERE metadata->>'filename' = $1
            )
        `;

    const result = await client.query(query, [filename]);

    // The result will be a boolean indicating if any matching rows were found
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking if file ${filename} is embedded:`, error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Create a tool for information retrieval
class RetrieveInfoTool extends Tool {
  name = 'retrieve_information';
  description = 'Retrieve relevant information from the document database';
  vectorStore: PGVectorStore;

  constructor(vectorStore: PGVectorStore) {
    super();
    this.vectorStore = vectorStore;
  }

  async _call(query: string) {
    agentic.logWithTimestamp(`RetrieveInfoTool called with query: ${query}`);
    const results = await this.vectorStore.similaritySearch(query, 3);

    const output = results.map((doc: any) => ({
      content: doc.pageContent,
      source: doc.metadata.source || 'Unknown',
      filename: doc.metadata.filename || 'Unknown',
      page: doc.metadata.loc?.pageNumber || doc.metadata.pdf?.page || 'Unknown',
    }));

    console.log(output);
    return JSON.stringify(output);
  }
}

// Define format instructions for the ReAct agent
const FORMAT_INSTRUCTIONS = `
RESPONSE FORMAT INSTRUCTIONS
----------------------------

When responding to me, please output a response in one of two formats:

**Option 1:**
Use this if you want to use a tool:
Thought: (your thought process)
Action: the action to take, should be one of [{tool_names}]
Action Input: (the input to the action)

**Option 2:**
Use this if you want to respond directly to the human:
Thought: (your thought process)
Final Answer: (your final answer to the human)

Please use Option 1 if you need to use a tool, and Option 2 if you can answer directly.
You must use the retrieve_information tool at least once before providing a Final Answer.
If the initial retrieval doesn't provide enough information, use the tool again with a refined query.
After using the tool, you must provide a Final Answer based on the information retrieved.
Always cite the source of information in your Final Answer, including the document name and page number if available.
Use the format (Source: [document name], Page: [page number]) for citations.
If multiple sources are used, cite each one.
`;

// Create an agent
async function createAgent(vectorStore: PGVectorStore) {
  agentic.logWithTimestamp('Initializing the AI agent...');
  const model = new Ollama({
    baseUrl: process.env.OLLAMA_BASE_URL || 'ollama',
    model: process.env.OLLAMA_MODEL || 'llama3',
    temperature: 0.2,
  });

  const tools = [new RetrieveInfoTool(vectorStore)];

  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `You are a helpful assistant with access to a document database. Use the available tools to retrieve relevant information and assist the user. If you don't know the answer, just say that you don't know, don't try to make up an answer.
${FORMAT_INSTRUCTIONS}
Tools available:
{tools}
Remember to always cite your sources in the Final Answer.
{agent_scratchpad}`,
    ),
    HumanMessagePromptTemplate.fromTemplate(
      'Question: {question}\n\nThis information comes from the file: {filename}\n\nPlease answer the question based on the given context.',
    ),
  ]);

  const agent = await createReactAgent({
    llm: model,
    prompt,
    tools,
  });

  agentic.logWithTimestamp('AI agent initialized and ready.');

  return AgentExecutor.fromAgentAndTools({
    agent,
    tools,
    verbose: isVerbose,
    maxIterations: 5, // Limit the number of tool uses
    handleParsingErrors: true,
    earlyStoppingMethod: 'force',
    returnIntermediateSteps: true,
  });
}

// Main function to handle user queries
async function handleUserQuery(
  agent: AgentExecutor,
  userMessage: string,
  contextFilename: string,
) {
  try {
    const vectorStore = agentic.vectorStore;
    if (!vectorStore) {
      throw new Error('Vector store is not initialized');
    }

    const input = {
      question: userMessage,
      filename: contextFilename,
    };

    agentic.logWithTimestamp(
      `Input to invoke for agent: ${JSON.stringify(input, null, 2)}`,
    );

    const result = await agent.invoke(input);

    if (process.env.VERBOSE === 'true') {
      console.log(
        'Intermediate steps:',
        JSON.stringify(result.intermediateSteps, null, 2),
      );
    }
    agentic.logWithTimestamp("\nAI Assistant's Answer:");
    agentic.logWithTimestamp(result.output);
    return result.output;
  } catch (error) {
    console.error('Error in handleUserQuery:', error);
    return "I'm sorry, an error occurred while processing your query.";
  }
}

export {
  loadAndEmbedDocuments,
  checkAndUpdateEmbeddings,
  createAgent,
  handleUserQuery,
};
