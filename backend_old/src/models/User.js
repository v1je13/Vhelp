import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  vkId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
