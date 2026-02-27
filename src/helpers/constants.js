import config from "../configs/config.js";
const {PHP_SERVER_URL , UNIPILE_API_KEY , UNIPILE_DSN} = config;
export default {
  baseAPI: "",
  routes_Url: {
    getAccountDetail : (id) => `${UNIPILE_DSN}/api/v1/accounts/${id}`,
    getQr : `${UNIPILE_DSN}/api/v1/accounts`,
    getAttachmentUrl : (messageId , attachmentId) =>`${UNIPILE_DSN}/api/v1/messages/${messageId}/attachments/${attachmentId}`,
    getPHPSERVER: (orgId) =>
      `${PHP_SERVER_URL}/smsapp/numberDetails.php?org_id=${orgId}`,
    getnumberSync: (INSTANCE_URL) =>
      `${INSTANCE_URL}/services/apexrest/tdc_tsw/WebWhatsAppSync`,
    checkURlTOSENDpending: (instanceUrl) =>
      `${instanceUrl}/services/data/v58.0/query?q=SELECT+Name,tdc_tsw__value__c+FROM+tdc_tsw__SMSIncomingAlert__c+WHERE+Name='Send Pending Messages'`,
    getSFPendingRecUrl: (instanceUrl, userId) =>
      `${instanceUrl}/services/data/v48.0/query/?q=SELECT+Id+,+tdc_tsw__Message_Text_New__c+,+tdc_tsw__ContextId__c+,+tdc_tsw__ToNumber__c+,+tdc_tsw__Sender_Number__c+,+tdc_tsw__Media_Payload__c+FROM+tdc_tsw__Message__c+where+tdc_tsw__Status__c+=+'Pending'+AND+Owner.Id=+'${userId}'+Order+by+CreatedDate+ASC`,
    getSFUpdateMsgUrl: (instanceUrl, id) =>
      `${instanceUrl}/services/data/v54.0/sobjects/tdc_tsw__Message__c/${id}`,

  },
  status: {
    active: "active",
    qrcode: "qr-screen",
    phoneError: "phone-error",
    idle: "idle",
    loading: "loading",
    disabled: "disabled",
    logout: "logout",
  },
};

export const unipileHeaders = {
  "content-type": "application/json" ,
  "X-API-KEY": UNIPILE_API_KEY
}



export const sendMsgObj={
  "Name": "",
  "tdc_tsw__Status__c": "",
  "tdc_tsw__Channel__c": "WhatsApp: Personal",
  "OwnerId": "",
  "tdc_tsw__ToNumber__c": "",
  "tdc_tsw__Source__c": "",
  "tdc_tsw__MessageId__c": "",
  "tdc_tsw__Message_Text_New__c": "",
  "tdc_tsw__Sender_Number__c": "",
}

export const querySF = {
  getRecordIdOfSMS :(fromNumber,messageId) =>
      `Select+Id+from+tdc_tsw__Message__c+where+tdc_tsw__Sender_Number__c+=+'${fromNumber}'+and+tdc_tsw__MessageId__c+=+'${messageId}'`,
  getSyncHistoryVal :(userId)=>
    `SELECT+Id,+Name,+tdc_tsw__Custom_Value__c+FROM+tdc_tsw__General_Setup__c+WHERE+Name+=+'Sync+Recent+History'+AND+RecordType.Name+=+'Custom+Setup'+AND+tdc_tsw__User_ID__c+=+'${userId}'+ORDER+BY+CreatedDate+DESC+LIMIT+1`
  

}

export const sf_LoginURL = {
  sandbox: (grantType, clientId, clientSecret, refreshToken) =>
    `https://test.salesforce.com/services/oauth2/token?grant_type=${grantType}&client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${refreshToken}`,

  prod: (grantType, clientId, clientSecret, refreshToken) =>
    `https://login.salesforce.com/services/oauth2/token?grant_type=${grantType}&client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${refreshToken}`,

  updateObj: (instanceUrl, recordId) =>
    recordId
      ? `${instanceUrl}/services/data/v54.0/sobjects/tdc_tsw__Message__c/${recordId}`
      : `${instanceUrl}/services/data/v58.0/sobjects/tdc_tsw__Message__c`,

  queryObj: (instanceUrl, query) =>
    `${instanceUrl}/services/data/v48.0/query/?q=${query}`,
};

export const authAppURL = (instanceUrl, orgid, needFromSf) => `${instanceUrl}/api/org/accessToken?orgId=${orgid}&needFromSf=${needFromSf}`

export const nodeRefreshTokenUpdateURl = (instanceUrl) => `${instanceUrl}/api/sf/token`;





export class createMessageObj {
  constructor(sessionId) {
    this.messageTimestamp = "";
    this.messageId = "";
    this.message = "";
    this.sessionId = sessionId;
    this.toNumber = "";
    this.fromNumber = "";
    this.type = "";
    this.contextMessageId="";
  }
  setMessgeInfo(fromMe, fromNumber, toNumber, contextMessageId, accountId, chatId) {
    this.toNumber = toNumber;
    this.fromNumber = fromNumber;
    this.type = fromMe ? "Outgoing" : "Incoming";
    this.contextMessageId = contextMessageId;
    this.accountId = accountId;
    this.chatId = chatId
  }
  setTextMessage(messageId, message, messageTimestamp, isEdit) {
    this.messageId = messageId;
    this.message = message;
    this.messageTimestamp = messageTimestamp;
    if (isEdit) this.isEdit = isEdit;
  }
  setMediaMessage(image, mimetype) {
    this.image = image;
    this.mimetype = mimetype;
  }

  setLocationMessage(degreesLatitude , degreesLongitude){
      this.latitude = degreesLatitude;
      this.longitude = degreesLongitude;
  }
  setDeliveryStatus(status) {
    this.deliveryStatus = status;
  }
  setGroupMessageInfo(fromMe,fromNumber,participant,groupId,contextMessageId, sfGroupId, groupName, chatId){
      this.fromNumber = fromNumber;
      this.participant = participant;
      this.type = fromMe ? "Outgoing" : "Incoming";
      this.groupId = groupId;
      this.contextMessageId = contextMessageId;
      this.sfGroupId =sfGroupId;
      this.groupName = groupName;   
      this.chatId = chatId ;  
  }
  setSFGroupId(sfGroupId){
      this.sfGroupId = sfGroupId;
  }
}
