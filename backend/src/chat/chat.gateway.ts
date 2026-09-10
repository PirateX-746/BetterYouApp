import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SseService } from '../sse/sse.service';

interface ChatPayload {
  conversationId: string;
  senderId: string;
  text?: string;
  image?: string;
  file?: string;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private onlineUsers = new Map<string, string>();

  constructor(
    private chatService: ChatService,
    private sseService: SseService,
  ) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.onlineUsers.set(userId, client.id);
      this.server.emit('onlineUsers', Array.from(this.onlineUsers.keys()));
    }
  }

  handleDisconnect(client: Socket) {
    for (const [key, value] of this.onlineUsers.entries()) {
      if (value === client.id) {
        this.onlineUsers.delete(key);
      }
    }
    this.server.emit('onlineUsers', Array.from(this.onlineUsers.keys()));
  }

  @SubscribeMessage('joinConversation')
  handleJoin(client: Socket, conversationId: string) {
    void client.join(conversationId);
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: ChatPayload) {
    void this.processMessage(payload);
  }

  private async processMessage(payload: ChatPayload) {
    if (!payload.conversationId) return;

    const saved = await this.chatService.saveMessage(payload);

    const conversation = await this.chatService.getConversationById(
      payload.conversationId,
    );

    if (conversation) {
      const isPractitionerSender =
        payload.senderId === conversation.practitionerId.toString();

      const recipientRole: 'patient' | 'practitioner' = isPractitionerSender
        ? 'patient'
        : 'practitioner';

      const recipientId = isPractitionerSender
        ? conversation.patientId.toString()
        : conversation.practitionerId.toString();

      await this.chatService.incrementUnread(
        payload.conversationId,
        recipientRole,
      );

      const totalUnread = await this.chatService.getTotalUnread(
        recipientId,
        recipientRole,
      );

      const preview = (payload.text ?? '').slice(0, 80);

      // Push real-time badge + notification via SSE (no socket room needed)
      this.sseService.pushNewMessage(
        recipientId,
        payload.conversationId,
        payload.senderId, // frontend resolves name from conversation list
        preview,
        totalUnread,
      );
    }

    // Deliver message content to everyone in the conversation room (WebSocket)
    this.server.to(payload.conversationId).emit('message', saved);
  }

  @SubscribeMessage('typing')
  handleTyping(client: Socket, conversationId: string) {
    void client.to(conversationId).emit('typing', conversationId);
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(client: Socket, conversationId: string) {
    void client.to(conversationId).emit('stopTyping', conversationId);
  }

  @SubscribeMessage('seen')
  async handleSeen(
    client: Socket,
    payload: { messageId: string; conversationId: string },
  ) {
    await this.chatService.markSeen(payload.messageId);
    this.server.to(payload.conversationId).emit('messageSeen', payload.messageId);
  }
}
