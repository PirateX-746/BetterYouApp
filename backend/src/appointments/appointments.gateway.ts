import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsAuthService } from '../common/ws/ws-auth.service';
import { socketCorsOptions } from '../common/cors';

@WebSocketGateway({ cors: socketCorsOptions() })
export class AppointmentsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppointmentsGateway.name);

  constructor(private readonly wsAuth: WsAuthService) {}

  async handleConnection(client: Socket) {
    const user = await this.wsAuth.authenticate(client);

    if (!user) {
      this.logger.warn('Rejected unauthenticated socket connection');
      client.emit('unauthorized', { message: 'Authentication required' });
      client.disconnect(true);
      return;
    }

    WsAuthService.attach(client, user);

    // A socket joins exactly one room: its own user id, taken from the
    // verified session. Room ids used to come from the handshake query
    // string, so any client could join any user's room and receive their
    // appointment updates and check-in notifications.
    await client.join(user.userId);
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

  // Notify practitioner that a patient has checked in
  emitPatientCheckedIn(
    practitionerId: string,
    payload: {
      appointmentId: string;
      patientName: string;
      appointmentTitle: string;
      appointmentStart: string;
      checkedInAt: string;
    },
  ) {
    this.server.to(practitionerId).emit('patientCheckedIn', payload);
  }
}
