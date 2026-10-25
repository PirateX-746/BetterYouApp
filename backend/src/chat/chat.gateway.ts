import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SseService } from '../sse/sse.service';
import { WsAuthService, type SocketUser } from '../common/ws/ws-auth.service';
import { socketCorsOptions } from '../common/cors';

interface ChatPayload {
  conversationId: string;
  text?: string;
  image?: string;
  file?: string;
}

@WebSocketGateway({ cors: socketCorsOptions() })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  /** userId → socket id */
  private onlineUsers = new Map<string, string>();

  constructor(
    private chatService: ChatService,
    private sseService: SseService,
    private wsAuth: WsAuthService,
  ) {}

  async handleConnection(client: Socket) {
    const user = await this.wsAuth.authenticate(client);

    if (!user) {
      // Anonymous sockets are dropped. Identity used to come from
      // ?userId= in the handshake, which let anyone impersonate anyone.
      this.logger.warn('Rejected unauthenticated socket connection');
      client.emit('unauthorized', { message: 'Authentication required' });
      client.disconnect(true);
      return;
    }

    WsAuthService.attach(client, user);
    this.onlineUsers.set(user.userId, client.id);
    this.server.emit('onlineUsers', Array.from(this.onlineUsers.keys()));
  }

  handleDisconnect(client: Socket) {
    for (const [key, value] of this.onlineUsers.entries()) {
      if (value === client.id) {
        this.onlineUsers.delete(key);
      }
    }
    this.server.emit('onlineUsers', Array.from(this.onlineUsers.keys()));
  }

  /**
   * Confirms the socket's authenticated user is one of the conversation's
   * two participants. Every conversation-scoped event goes through this, so
   * a signed-in user cannot read or write someone else's thread by guessing
   * an id.
   */
  private async participantOf(
    client: Socket,
    conversationId: string,
  ): Promise<SocketUser | null> {
    const user = WsAuthService.userOf(client);
    if (!user || !conversationId) return null;

    const conversation =
      await this.chatService.getConversationById(conversationId);
    if (!conversation) return null;

    const participants = [
      String(conversation.patientId),
      String(conversation.practitionerId),
    ];

    return participants.includes(user.userId) ? user : null;
  }

  @SubscribeMessage('joinConversation')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    const user = await this.participantOf(client, conversationId);
    if (!user) {
      client.emit('error', {
        message: 'Not a participant in that conversation',
      });
      return;
    }
    await client.join(conversationId);
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatPayload,
  ) {
    const user = await this.participantOf(client, payload?.conversationId);
    if (!user) {
      client.emit('error', {
        message: 'Not a participant in that conversation',
      });
      return;
    }

    // senderId comes from the verified session, never from the payload —
    // the client used to supply it and could claim to be anyone.
    await this.processMessage(payload, user);
  }

  private async processMessage(payload: ChatPayload, sender: SocketUser) {
    const senderId = sender.userId;

    const saved = await this.chatService.saveMessage({
      conversationId: payload.conversationId,
      senderId,
      text: payload.text,
      image: payload.image,
      file: payload.file,
    });

    const conversation = await this.chatService.getConversationById(
      payload.conversationId,
    );

    if (conversation) {
      const isPractitionerSender =
        senderId === conversation.practitionerId.toString();

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
        senderId, // frontend resolves name from conversation list
        preview,
        totalUnread,
      );
    }

    // Deliver message content to everyone in the conversation room (WebSocket)
    this.server.to(payload.conversationId).emit('message', saved);
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    if (!(await this.participantOf(client, conversationId))) return;
    client.to(conversationId).emit('typing', conversationId);
  }

  @SubscribeMessage('stopTyping')
  async handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    if (!(await this.participantOf(client, conversationId))) return;
    client.to(conversationId).emit('stopTyping', conversationId);
  }

  @SubscribeMessage('seen')
  async handleSeen(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageId: string; conversationId: string },
  ) {
    if (!(await this.participantOf(client, payload?.conversationId))) return;

    await this.chatService.markSeen(payload.messageId);
    this.server
      .to(payload.conversationId)
      .emit('messageSeen', payload.messageId);
  }
}
