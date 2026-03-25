import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

interface ChatPayload {
  conversationId: string;
  senderId: string;
  text?: string;
  image?: string;
  file?: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private onlineUsers = new Map<string, string>();

  constructor(private chatService: ChatService) {}

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

  /* ================= JOIN ROOM ================= */

  @SubscribeMessage('joinConversation')
  handleJoin(client: Socket, conversationId: string) {
    void client.join(conversationId);
  }

  /* ================= MESSAGE ================= */

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: ChatPayload) {
    void this.processMessage(client, payload);
  }

  private async processMessage(client: Socket, payload: ChatPayload) {
    if (!payload.conversationId) return;

    const saved = await this.chatService.saveMessage({
      ...payload,
    });

    // Identify recipient role to increment unread
    const conversation = await this.chatService.getConversationById(
      payload.conversationId,
    );

    if (conversation) {
      const isPractitionerSender =
        payload.senderId === conversation.practitionerId.toString();
      const recipientRole = isPractitionerSender ? 'patient' : 'practitioner';
      await this.chatService.incrementUnread(
        payload.conversationId,
        recipientRole,
      );
    }

    this.server.to(payload.conversationId).emit('message', saved);
  }

  /* ================= TYPING ================= */

  @SubscribeMessage('typing')
  handleTyping(client: Socket, conversationId: string) {
    void client.to(conversationId).emit('typing', conversationId);
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(client: Socket, conversationId: string) {
    void client.to(conversationId).emit('stopTyping', conversationId);
  }

  /* ================= SEEN ================= */

  @SubscribeMessage('seen')
  async handleSeen(
    client: Socket,
    payload: { messageId: string; conversationId: string },
  ) {
    await this.chatService.markSeen(payload.messageId);

    this.server
      .to(payload.conversationId)
      .emit('messageSeen', payload.messageId);
  }
}
