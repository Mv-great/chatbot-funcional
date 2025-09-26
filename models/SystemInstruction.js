import mongoose from 'mongoose';

const systemInstructionSchema = new mongoose.Schema({
    botId: {
        type: String,
        required: true,
        unique: true,
        default: 'assistente-gemini-ifpr'
    },
    instruction: {
        type: String,
        required: true,
        default: 'Você é um assistente educacional inteligente do IFPR. Responda de forma clara, educativa e sempre incentive o aprendizado. Mantenha um tom amigável e profissional.'
    },
    updatedBy: {
        type: String,
        default: 'admin'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const SystemInstruction = mongoose.model('SystemInstruction', systemInstructionSchema, 'systemInstructions');

export default SystemInstruction;
