import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        trim: true,
        default: 'Usuário Anônimo'
    },
    // Campo para a instrução de sistema personalizada do usuário
    systemInstruction: {
        type: String,
        trim: true,
        default: '' // String vazia significa que o usuário não tem uma personalidade personalizada
    },
    // Campo para armazenar preferências futuras (ex: modelo de IA preferido, tema, etc.)
    preferences: {
        type: Map,
        of: String,
        default: {}
    }
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema, 'users');

export default User;
