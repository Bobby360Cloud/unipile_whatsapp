import mongoose from 'mongoose';

const userSchema=mongoose.Schema({
    account_id:{type:String, default : null  },
    number:{type:String, default : null},
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
    loggedIn:{type:Boolean, default: false}

},{timestamps: { createdAt: 'createdat', updatedAt: 'updatedat' }})

const userModel=mongoose.model("userModel",userSchema);

export default userModel;

