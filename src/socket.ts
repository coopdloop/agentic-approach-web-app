import { Server } from 'http';
import { Socket, Server as SocketIOServer } from 'socket.io';
import { agentic } from './helper';

function setupSocketIO(server: Server) {
  const io = new SocketIOServer(server);
  const agentNamespace = io.of('/agent');
  agentic.setAgentNamespace(agentNamespace);

  agentNamespace.on('connection', (socket: Socket) => {
    agentic.logWithTimestamp(`Client connected: ${socket.id}`);

    socket.on('clientReady', () => {
      agentic.logWithTimestamp(`Client ready: ${socket.id}`);
      const queuedEvents = agentic.getQueuedEvents();
      queuedEvents.embeddingStatus.forEach((data) => {
        socket.emit('embeddingStatus', data);
      });

      if (queuedEvents.agentReady !== null) {
        socket.emit('agentReady', true);
      }
    });
  });
}

export default setupSocketIO;
