import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Get('conversations/:userId')
    async getConversations(@Param('userId') userId: string) {
        return this.chatService.getUserConversations(userId);
    }

    @Get('messages/:conversationId')
    async getMessages(@Param('conversationId') conversationId: string) {
        return this.chatService.getConversationMessages(conversationId);
    }

    @Post('conversation')
    async getOrCreateConversation(
        @Body() body: { patientId: string; practitionerId: string },
    ) {
        return this.chatService.getOrCreateConversation(
            body.patientId,
            body.practitionerId,
        );
    }

    @Post('reset-unread/:conversationId')
    async resetUnread(
        @Param('conversationId') conversationId: string,
        @Body() body: { role: 'patient' | 'practitioner' },
    ) {
        return this.chatService.resetUnread(conversationId, body.role);
    }
}
