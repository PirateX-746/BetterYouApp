// lib/socket.ts — update createSocket to accept either role

import { io, Socket } from 'socket.io-client';

interface SocketOptions {
  userId?: string;
  patientId?: string;
  practitionerId?: string;
}

let socket: Socket | null = null;

export function createSocket(options: SocketOptions): Socket {
  if (socket?.connected) socket.disconnect();

  socket = io(
    process.env.NEXT_PUBLIC_SOCKET_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '',
    {
      query: {
        ...(options.userId && { userId: options.userId }),
        ...(options.patientId && { patientId: options.patientId }),
        ...(options.practitionerId && {
          practitionerId: options.practitionerId,
        }),
      },
      transports: ['websocket'],
      withCredentials: true,
    },
  );

  return socket;
}
