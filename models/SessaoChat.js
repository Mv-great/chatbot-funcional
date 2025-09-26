import mongoose from 'mongoose';

const sessaoChatSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    botId: {
        type: String,
        default: 'assistente-gemini-ifpr'
    },
    userId: {
        type: String,
        required: true
    },
    titulo: {
        type: String,
        default: 'Conversa Sem Título',
        trim: true
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    messages: [{
        role: {
            type: String,
            enum: ['user', 'model'],
            required: true
        },
        parts: [{
            text: {
                type: String,
                required: true
            }
        }],
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    loggedAt: {
        type: Date,
        default: Date.now
    }
}, { 
    strict: false,
    timestamps: true
});

const SessaoChat = mongoose.model('SessaoChat', sessaoChatSchema, 'sessoesChat');

export default SessaoChat;
