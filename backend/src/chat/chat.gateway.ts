import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private onlineUsers = new Map<string, string>();

  constructor(private chatService: ChatService) { }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (userId) {
      this.onlineUsers.set(userId, client.id);
      this.server.emit(
        'onlineUsers',
        Array.from(this.onlineUsers.keys()),
      );
    }
  }

  handleDisconnect(client: Socket) {
    for (const [key, value] of this.onlineUsers.entries()) {
      if (value === client.id) {
        this.onlineUsers.delete(key);
      }
    }

    this.server.emit(
      'onlineUsers',
      Array.from(this.onlineUsers.keys()),
    );
  }

  /* ================= JOIN ROOM ================= */

  @SubscribeMessage('joinConversation')
  handleJoin(client: Socket, conversationId: string) {
    console.log(`[ChatGateway] Client ${client.id} joining conversation: ${conversationId}`);
    client.join(conversationId);
  }

  /* ================= MESSAGE ================= */

  @SubscribeMessage('message')
  async handleMessage(
    client: Socket,
    payload: any,
  ) {
    console.log('[ChatGateway] Received message payload:', payload);

    if (!payload.conversationId) {
      console.error('[ChatGateway] Error: conversationId is missing in payload!');
      return;
    }

    const saved = await this.chatService.saveMessage({
      ...payload,
      status: 'delivered',
    });

    // Identify recipient role to increment unread
    const conversation = await (this.chatService as any).conversationModel.findById(payload.conversationId);
    if (conversation) {
      const isPractitionerSender = payload.senderId === conversation.practitionerId;
      const recipientRole = isPractitionerSender ? 'patient' : 'practitioner';
      await this.chatService.incrementUnread(payload.conversationId, recipientRole);
    }

    // This is a bit inefficient, better way would be to pass it in payload or fetch conversation once
    // For now, let's just emit and we'll refine if needed.

    // In a real app, we'd check who is NOT the sender.
    // For BetterYou, we can assume if sender is practitioner, recipient is patient.

    // Emitting to the room
    console.log(`[ChatGateway] Emitting message to room ${payload.conversationId}`);
    this.server
      .to(payload.conversationId)
      .emit('message', saved);
  }

  /* ================= TYPING ================= */

  @SubscribeMessage('typing')
  handleTyping(client: Socket, conversationId: string) {
    client
      .to(conversationId)
      .emit('typing', conversationId);
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    client: Socket,
    conversationId: string,
  ) {
    client
      .to(conversationId)
      .emit('stopTyping', conversationId);
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