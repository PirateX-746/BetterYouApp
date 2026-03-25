import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // tighten in production
  },
})
export class AppointmentsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const patientId = client.handshake.query.patientId as string;
    const practitionerId = client.handshake.query.practitionerId as string;
    const userId = client.handshake.query.userId as string;

    // Join whichever room IDs are provided
    if (patientId) client.join(patientId);
    if (practitionerId) client.join(practitionerId);
    // userId is a fallback used by some clients
    if (userId && userId !== patientId && userId !== practitionerId) {
      client.join(userId);
    }
  }

  // Allow clients to join a conversation room explicitly (used by chat)
  @SubscribeMessage('joinConversation')
  handleJoinConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(conversationId);
  }

  // Emit to both the patient AND the practitioner so both calendars update
  emitAppointmentUpdate(
    patientId: string,
    data: Record<string, unknown>,
    practitionerId?: string,
  ) {
    this.server.to(patientId).emit('appointmentUpdated', data);
    if (practitionerId) {
      this.server.to(practitionerId).emit('appointmentUpdated', data);
    }
  }
}
