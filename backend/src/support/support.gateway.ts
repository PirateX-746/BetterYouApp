import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthService } from '../common/ws/ws-auth.service';
import { socketCorsOptions } from '../common/cors';
import { Role } from '../common/role.enum';

/** Every platform admin's socket, for "a practitioner wrote in" events. */
export const SUPPORT_ADMINS_ROOM = 'support-admins';

export interface SupportTicketEvent {
  ticketId: string;
  ticketNo: string;
  status: string;
  /** What happened, so the client can word a toast. */
  kind: 'created' | 'reply' | 'status';
  /** Who caused it. */
  by: 'requester' | 'support';
}

/**
 * Live support updates. Rides the same Socket.io server as the other
 * gateways (each socket is already in its own user-id room — see
 * AppointmentsGateway); this one only adds platform admins to a shared room.
 *
 * Events carry ids and status only, never message text: clients re-fetch the
 * ticket through the authorized REST API.
 */
@WebSocketGateway({ cors: socketCorsOptions() })
export class SupportGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SupportGateway.name);

  constructor(private readonly wsAuth: WsAuthService) {}

  async handleConnection(client: Socket) {
    // Rejection (and the user-id room) is handled by AppointmentsGateway;
    // here an unauthenticated socket simply joins nothing.
    const user = await this.wsAuth.authenticate(client);
    if (user?.role === Role.SUPER_ADMIN) {
      await client.join(SUPPORT_ADMINS_ROOM);
    }
  }

  toRequester(requesterId: string, event: SupportTicketEvent) {
    this.server.to(requesterId).emit('supportTicketUpdated', event);
  }

  toAdmins(event: SupportTicketEvent) {
    this.server.to(SUPPORT_ADMINS_ROOM).emit('supportTicketUpdated', event);
  }
}
