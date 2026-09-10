import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SseService } from '../sse/sse.service';
import { Role } from '../common/role.enum';
import { assertSelf, type AuthedRequest, type AuthUser } from '../common/auth-user';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly sseService: SseService,
  ) {}

  /**
   * Loads a conversation and confirms the caller is one of its two
   * participants. Every conversation-scoped route goes through here so a
   * signed-in user cannot read someone else's thread by guessing an id.
   */
  private async assertParticipant(conversationId: string, user: AuthUser) {
    const conversation =
      await this.chatService.getConversationById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    const participants = [
      String(conversation.patientId),
      String(conversation.practitionerId),
    ];
    if (!participants.includes(user.userId)) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    return conversation;
  }

  @Get('conversations/:userId')
  async getConversations(
    @Param('userId') userId: string,
    @Req() req: AuthedRequest,
  ) {
    assertSelf(req.user, userId);
    return this.chatService.getUserConversations(userId);
  }

  @Get('messages/:conversationId')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Req() req: AuthedRequest,
  ) {
    await this.assertParticipant(conversationId, req.user);
    return this.chatService.getConversationMessages(conversationId);
  }

  @Post('conversation')
  async getOrCreateConversation(
    @Body() body: { patientId: string; practitionerId: string },
    @Req() req: AuthedRequest,
  ) {
    // The caller must be opening a thread they are part of — a patient can
    // only be the patient side, a practitioner only the practitioner side.
    const ownSide =
      req.user.role === Role.PRACTITIONER
        ? body.practitionerId
        : body.patientId;
    assertSelf(req.user, String(ownSide));

    return this.chatService.getOrCreateConversation(
      body.patientId,
      body.practitionerId,
    );
  }

  @Post('reset-unread/:conversationId')
  async resetUnread(
    @Param('conversationId') conversationId: string,
    @Body() body: { role: 'patient' | 'practitioner' },
    @Req() req: AuthedRequest,
  ) {
    await this.assertParticipant(conversationId, req.user);

    // Derive both the side and the user from the verified token rather than
    // trusting the body, so a caller cannot clear someone else's badge.
    const role = req.user.role === Role.PRACTITIONER ? 'practitioner' : 'patient';
    void body;

    await this.chatService.resetUnread(conversationId, role);

    const totalUnread = await this.chatService.getTotalUnread(
      req.user.userId,
      role,
    );
    this.sseService.pushUnreadReset(req.user.userId, totalUnread);

    return { ok: true };
  }
}
