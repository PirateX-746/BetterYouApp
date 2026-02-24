import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: "*", // dev only
  },
})
export class AppointmentsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const patientId = client.handshake.query.patientId as string;

    if (patientId) {
      client.join(patientId);
      console.log(`Patient ${patientId} connected`);
    }
  }

  emitAppointmentUpdate(patientId: string, data: any) {
    this.server.to(patientId).emit("appointmentUpdated", data);
  }
}
