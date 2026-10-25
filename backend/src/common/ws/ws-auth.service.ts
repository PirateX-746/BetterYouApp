import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Socket } from 'socket.io';
import { Role } from '../role.enum';
import { AUTH_COOKIE } from '../../auth/auth.cookies';
import { isAllowedOrigin } from '../cors';
import { Patient } from '../../patients/schemas/patient.schema';
import { Practitioner } from '../../practitioners/schemas/practitioner.schema';
import { PlatformAdmin } from '../../platform-admins/schemas/platform-admin.schema';

export interface SocketUser {
  userId: string;
  role: Role;
}

interface JwtPayload {
  sub?: string;
  role?: Role;
}

/** Reads one cookie out of a raw Cookie header. */
export function readCookie(
  header: string | undefined,
  name: string,
): string | null {
  if (!header) return null;

  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

/**
 * Authenticates a Socket.io connection.
 *
 * Sockets used to take identity straight from the handshake query string
 * (`?userId=...`), so any client could claim to be any user and receive that
 * person's messages and appointment updates. Identity now comes only from
 * the signed session cookie — the same one the REST API uses.
 */
@Injectable()
export class WsAuthService {
  private readonly logger = new Logger(WsAuthService.name);

  constructor(
    private readonly jwt: JwtService,
    @InjectModel(Patient.name)
    private readonly patientModel: Model<{ isActive?: boolean; role: Role }>,
    @InjectModel(Practitioner.name)
    private readonly practitionerModel: Model<{
      isActive?: boolean;
      role: Role;
    }>,
    @InjectModel(PlatformAdmin.name)
    private readonly platformAdminModel: Model<{
      isActive?: boolean;
      role: Role;
    }>,
  ) {}

  async authenticate(client: Socket): Promise<SocketUser | null> {
    // Cross-site WebSocket hijacking: Socket.io's `cors` option does not
    // apply to the websocket transport, and the SameSite=None cookie rides
    // along on a handshake from any page. A browser always sends Origin on
    // a WebSocket upgrade, so a foreign one means a page we don't control.
    const origin = client.handshake.headers.origin;
    if (origin !== undefined && !isAllowedOrigin(origin)) {
      this.logger.warn(`Rejected socket handshake from origin ${origin}`);
      return null;
    }

    const token =
      readCookie(client.handshake.headers.cookie, AUTH_COOKIE) ??
      // Non-browser clients (tests, a future mobile app) may pass it here.
      (typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : null);

    if (!token) return null;

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      return null;
    }

    const userId = payload.sub;
    const role = payload.role;
    if (!userId || !role) return null;

    // Confirm the account still exists and is active, so a deactivated user
    // cannot keep a live socket until their token happens to expire.
    // One collection per kind of account, as in JwtStrategy. Platform admins
    // used to fall through to the practitioners lookup, so every console
    // socket was rejected and the console never received live updates.
    const model =
      role === Role.SUPER_ADMIN
        ? this.platformAdminModel
        : role === Role.PATIENT
          ? this.patientModel
          : this.practitionerModel;

    const user = await model
      .findById(userId)
      .select('_id role isActive')
      .lean()
      .exec();

    if (!user) return null;
    if ('isActive' in user && user.isActive === false) return null;

    return { userId, role: user.role ?? role };
  }

  /** Identity attached by `authenticate`, or null if the socket is anonymous. */
  static userOf(client: Socket): SocketUser | null {
    return (client.data as { user?: SocketUser }).user ?? null;
  }

  /** Stores the authenticated user on the socket for `userOf`. */
  static attach(client: Socket, user: SocketUser): void {
    (client.data as { user?: SocketUser }).user = user;
  }
}
