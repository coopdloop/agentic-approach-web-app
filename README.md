# RAG Query System with Ollama Integration

## Overview

This project implements a Retrieval-Augmented Generation (RAG) query system integrated with Ollama, a local large language model. It uses Socket.IO for real-time communication, PostgreSQL with pgvector for efficient vector storage and retrieval, and TypeScript for type-safe development.

## Features

- **RAG Query System**: Utilizes a vector database to enhance query responses with relevant context.
- **Ollama Integration**: Leverages Ollama for local, efficient large language model inference.
- **Real-time Updates**: Uses Socket.IO for live updates on document processing and agent status.
- **Document Embedding**: Automatically embeds new documents added to the system.
- **TypeScript Support**: Provides type safety and improved developer experience.
- **Scalable Architecture**: Designed with modularity and scalability in mind.

## Prerequisites

- Node.js (v14 or later)
- PostgreSQL with pgvector extension
- Ollama installed and running locally

## Setup

1. Clone the repository:

   ```
   git clone git@github.com:coopdloop/agentic-approach-web-app.git
   cd git@github.com:coopdloop/agentic-approach-web-app.git
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the following:

   ```
   DATABASE_URL=postgres://[user]:[password]@localhost:5432/[dbname]
   PORT=3000
   DB_HOST="localhost"
   DB_PORT=5432
   DB_USER="myuser"
   DB_PASSWORD="ChangeMe"
   DB_DATABASE="api"
   OLLAMA_BASE_URL="http://localhost:11434"
   OLLAMA_MODEL="llama3"
   ```

4. Initialize the database:

   ```
   npm run db:init
   ```

5. Start the server:
   ```
   npm dev
   ```

## Usage

1. Access the web interface at `http://localhost:3000`.
2. Upload documents through the interface or place them in the `./documents` directory.
3. The system will automatically embed new documents.
4. Use the query interface to ask questions. The system will use RAG to provide context-enhanced responses.

## Project Structure

- `src/`
  - `index.ts`: Main entry point
  - `helpers.ts`: Contains the `Agentic` class for managing application state
  - `rag.ts`: Implements RAG functionality
  - `db.ts`: Database connection and operations
  - `ollama.ts`: Ollama integration
  - `config.ts`: Database config
  - `types.ts`: Types
- `public/`: Frontend assets
- `documents/`: Directory for document storage

## Key Components

### Agentic Class

The `Agentic` class manages the application state and provides utility functions. It's implemented as a singleton to ensure consistency across the application.

### Socket.IO Integration

Real-time updates are handled through Socket.IO, allowing live feedback on document processing and agent status.

### Vector Store

The project uses pgvector to store and retrieve document embeddings efficiently.

## Development

To run the project in development mode with hot reloading:

```
npm run dev
```

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## License

[Your chosen license]

## Acknowledgements

- Ollama project for providing the local large language model capability.
- Langchain for the RAG implementation foundations.
- Socket.IO for real-time communication features.
