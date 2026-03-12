import mongoose from 'mongoose';

const userSchema=mongoose.Schema({
    sessionId:{type:String,unique:true},
    orgId:{type:String},
    userId:{type:String},
    sf_instanceUrl:{type:String},
    sf_accessToken:{type:String},
    sf_loginType:{type:String},
    timestamps:{type:String},
    isGroupSupported:{type:Boolean, default: false},
    custom_namespace: String

},{timestamps: { createdAt: 'createdat', updatedAt: 'updatedat' }})

const userModel=mongoose.model("userModel",userSchema);

export default userModel;

