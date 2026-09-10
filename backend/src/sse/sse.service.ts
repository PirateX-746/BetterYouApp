import { Injectable } from '@nestjs/common';

type WriteFn = (chunk: string) => void;

@Injectable()
export class SseService {
  // userId → set of active SSE write functions (one per open tab)
  private readonly clients = new Map<string, Set<WriteFn>>();

  add(userId: string, write: WriteFn): void {
    if (!this.clients.has(userId)) this.clients.set(userId, new Set());
    this.clients.get(userId)!.add(write);
  }

  remove(userId: string, write: WriteFn): void {
    const set = this.clients.get(userId);
    if (!set) return;
    set.delete(write);
    if (set.size === 0) this.clients.delete(userId);
  }

  /** Push a named SSE event to every open tab for this user. */
  push(userId: string, event: string, data: object): void {
    const set = this.clients.get(userId);
    if (!set || set.size === 0) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const write of set) {
      try {
        write(payload);
      } catch {
        // Client disconnected mid-write — will be cleaned up on req.close
      }
    }
  }

  pushNewMessage(
    recipientId: string,
    conversationId: string,
    senderName: string,
    preview: string,
    totalUnread: number,
  ): void {
    this.push(recipientId, 'new_message', {
      conversationId,
      senderName,
      preview,
      totalUnread,
    });
  }

  pushUnreadReset(userId: string, totalUnread: number): void {
    this.push(userId, 'unread_reset', { totalUnread });
  }
}
