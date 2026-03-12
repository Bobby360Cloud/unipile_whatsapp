import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
  account_id: {
    type: String,
    default: null
  },
  sessionId : {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  number: {
    type: String,
    index: true
  },
  loggedIn:{type:Boolean, default: false}
 
}, { 
  timestamps: true 
});

export default mongoose.model('Account', AccountSchema);