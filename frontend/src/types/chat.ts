export type MessageStatus = 'sent' | 'delivered' | 'seen';

export interface Message {
    _id?: string;
    conversationId: string;
    senderId: string;
    text?: string;
    image?: string;
    file?: string;
    status?: MessageStatus;
    createdAt: string;
    updatedAt?: string;
}

export interface Conversation {
    _id: string;
    name: string;
    unread?: number;
    lastMessage?: string;
    updatedAt?: string;
}

export interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'patient' | 'practitioner';
}
