import mongoose from 'mongoose';

const errorRecord = new mongoose.Schema({
    userId: String,
    orgId: String,
    fromnum: String,
    sessionId: String,
    error_code: String,
    error_message: String,
    error_type: {
        type: String,
        enum: ["Salesforce", "WhatsApp", "General Error"]
    },
},
    {
        timestamps: { createdAt: 'createdat', updatedAt: 'updatedat' },
    }
);
export default mongoose.model("errorRecord", errorRecord);