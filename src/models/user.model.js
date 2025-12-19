import mongoose from 'mongoose';

const userSchema=mongoose.Schema({
    phone_id:{type:String,unique:true},
    sessionId:{type:String,unique:true},
    orgId:{type:String},
    userId:{type:String},
    sf_instanceUrl:{type:String},
    sf_accessToken:{type:String},
    sf_refreshToken:{type:String},
    sf_loginType:{type:String},
    timestamps:{type:String},
    isGroupSupported:{type:Boolean, default: false},
    custom_namespace: String,
    mode:{type:String, enum:['Trial','live', 'closed'], default:'Trial'},

},{timestamps: { createdAt: 'createdat', updatedAt: 'updatedat' }})

const userModel=mongoose.model("userModel",userSchema);

export default userModel;

