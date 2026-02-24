import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
    Message,
    MessageDocument,
} from './schemas/message.schema';

import {
    Conversation,
    ConversationDocument,
} from './schemas/conversation.schema';

@Injectable()
export class ChatService {
    constructor(
        @InjectModel(Message.name)
        private messageModel: Model<MessageDocument>,

        @InjectModel(Conversation.name)
        private conversationModel: Model<ConversationDocument>,
    ) { }

    /* ================= SAVE MESSAGE ================= */

    async saveMessage(data: {
        conversationId: string;
        senderId: string;
        text?: string;
        image?: string;
        file?: string;
    }) {
        console.log('[ChatService] Saving message with data:', data);
        const message = await this.messageModel.create(data);
        // Update conversation's updatedAt timestamp
        await this.conversationModel.findByIdAndUpdate(data.conversationId, {
            updatedAt: new Date(),
        });
        return message;
    }

    /* ================= MARK SEEN ================= */

    async markSeen(messageId: string) {
        return this.messageModel.findByIdAndUpdate(
            messageId,
            { status: 'seen' },
            { new: true },
        );
    }

    /* ================= GET MESSAGES ================= */

    async getConversationMessages(conversationId: string) {
        return this.messageModel
            .find({ conversationId })
            .sort({ createdAt: 1 });
    }

    /* ================= GET OR CREATE CONVERSATION ================= */

    async getOrCreateConversation(
        patientId: string,
        practitionerId: string,
    ) {
        let conversation =
            await this.conversationModel.findOne({
                patientId,
                practitionerId,
            });

        if (!conversation) {
            conversation =
                await this.conversationModel.create({
                    patientId,
                    practitionerId,
                    unreadForPatient: 0,
                    unreadForPractitioner: 0,
                });
        }
        console.log('[ChatService] getOrCreateConversation returning:', conversation);
        return conversation;
    }

    /* ================= GET USER CONVERSATIONS ================= */

    async getUserConversations(userId: string) {
        return this.conversationModel
            .find({
                $or: [{ patientId: userId }, { practitionerId: userId }],
            })
            .populate('patientId', 'firstName lastName')
            .populate('practitionerId', 'firstName lastName')
            .sort({ updatedAt: -1 });
    }

    /* ================= INCREMENT UNREAD ================= */

    async incrementUnread(
        conversationId: string,
        receiverRole: 'patient' | 'practitioner',
    ) {
        if (receiverRole === 'patient') {
            await this.conversationModel.findByIdAndUpdate(
                conversationId,
                { $inc: { unreadForPatient: 1 } },
            );
        } else {
            await this.conversationModel.findByIdAndUpdate(
                conversationId,
                { $inc: { unreadForPractitioner: 1 } },
            );
        }
    }

    /* ================= RESET UNREAD ================= */

    async resetUnread(
        conversationId: string,
        role: 'patient' | 'practitioner',
    ) {
        console.log(`[ChatService] Resetting unread for ${role} in conversation ${conversationId}`);
        if (role === 'patient') {
            await this.conversationModel.findByIdAndUpdate(
                conversationId,
                { unreadForPatient: 0 },
            );
        } else {
            await this.conversationModel.findByIdAndUpdate(
                conversationId,
                { unreadForPractitioner: 0 },
            );
        }
    }
}