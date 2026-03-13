import mongoose from 'mongoose';

const checkNumberSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  number: {
    type: String,
    required: true,
    index: true
  },
  groupName: {
    type: String,
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  sf_groupId: {
    type: String,
    default: null
  },
  chat_id: {
    type: String,
    required: true,
  }
}, {
  timestamps: true
});

export default mongoose.model('CheckNumber', checkNumberSchema);