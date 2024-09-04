import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import http from 'http';
import { handleUserQuery, checkAndUpdateEmbeddings } from './rag';
import path from 'path';
import fs from 'fs';
import { agentic } from './helper';
import initializeAgent from './agent';
import setupSocketIO from './socket';
import { upload } from './storage';
const app = express();
const server = http.createServer(app);
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(
  '/socket.io',
  express.static(path.join(__dirname, '../node_modules/socket.io/client-dist')),
);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.post('/query', async (req, res) => {
  try {
    const { query, context } = req.body;
    agentic.logWithTimestamp(`query received: ${query}`);
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    if (!context) {
      return res.status(400).json({ error: 'Context file is required' });
    }
    if (agentic.agent) {
      const result = await handleUserQuery(agentic.agent, query, context);
      res.json({ result: result });
    } else {
      agentic.logWithTimestamp('Agent not initialized.');
    }
  } catch (error) {
    console.error('Error processing query:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while processing your query' });
  }
});

app.get('/check-new-documents', async (req, res) => {
  try {
    await checkAndUpdateEmbeddings(
      agentic.documentsDirectory,
      (filename, status) => {
        agentic.queueEvent('embeddingStatus', { filename, status });
      },
    );
    res.json({ message: 'Document check completed successfully.' });
  } catch (error) {
    console.error('Error checking for new documents:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while checking for new documents' });
  }
});

app.get('/document-list', (req, res) => {
  try {
    const files = fs.readdirSync(agentic.documentsDirectory);
    res.json({ documents: files });
  } catch (error) {
    console.error('Error reading document list:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while reading the document list' });
  }
});

app.post('/upload', upload.single('document'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  agentic.logWithTimestamp(`New document uploaded: ${req.file.filename}`);

  checkAndUpdateEmbeddings(agentic.documentsDirectory, (filename, status) => {
    agentic.queueEvent('embeddingStatus', { filename, status });
  });
  res.json({
    message: 'File uploaded successfully',
    filename: req.file.filename,
  });
});

app.post('/embed', async (req, res) => {
  try {
    const { documentName } = req.body;
    agentic.logWithTimestamp(`Document embed received: ${documentName}`);
    if (!documentName) {
      return res.status(400).json({ error: 'File is required' });
    }
    if (agentic.agent) {
      agentic.handleNewDocument(documentName);
      res.json({ message: `File being processed: ${documentName}` });
    } else {
      agentic.logWithTimestamp('Agent not initialized.');
    }
  } catch (error) {
    console.error('Error processing query:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while processing your query' });
  }
});

app.get('/socket.io/socket.io.js', (req, res) => {
  res.sendFile(
    __dirname + '../node_modules/socket.io/client-dist/socket.io.js',
  );
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  agentic.logWithTimestamp(`Server is running on port ${PORT}`);
});

initializeAgent().catch(console.error);
setupSocketIO(server);

export default app;
