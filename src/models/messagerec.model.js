import mongoose from 'mongoose';

const userRec = new mongoose.Schema({
    orgid: String,
    userid: String,
    sessionid: String,
    timestamps: String
},
    {
        timestamps: { createdAt: 'createdat', updatedAt: 'updatedat' },
    }
);

userRec.index({ sessionid: 'text'});

export default mongoose.model("userRec", userRec);