import mongoose from 'mongoose';

const checkNumberSchema = new mongoose.Schema({
  orgId: {
    type: String,
    required: true,
    index: true
  },
  number: {
    type: String,
    required: true,
    index: true
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  sf_groupId: {
    type: String,
    default: null
  },
}, { 
  timestamps: true,  
  unique: [
    { orgId: 1, number: 1 }
  ] 
});

export default mongoose.model('CheckNumber', checkNumberSchema);