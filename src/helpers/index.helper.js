// Central entrypoint for helper utilities.
// Import from this file to get any helper method in one place.

import {
  getMessageTime,
  generateTimeStamp,
  saveUserLogTime,
  isGroupSupported,
  getNumAvailability,
  getGroupName,
  getGroupAvailability,
  manageUnipileLogin,
  manageUnipileLogout,
} from './helper.js';

import {
  bulkUpdateNumbersWithFalse,
  bulkUpdateNumbersWithTrue,
  numberUpdateWithTrue,
  numberUpdateWithFalse,
  updateGroup,
} from './dbhelper.js';

import {
  handleQRGeneration,
  handlewebhookSetup,
  getAccountStatus,
} from './apiHelper.js';

import {
  oneToOneMessageParser,
  groupMessageParser,
  editMessageParser,
  deliveryParser,
} from './messageParser.js';

import {
  makeRequest,
  getRequest,
  postRequest,
  patchRequest,
  getFileBuffer,
  formDataRequest,
} from './request.js';

import {
  sendSFPendingRec,
  CheckAvailableNumbers,
  getConnectToSf,
  sendMobIncomingOutgoingMsgToSF,
  sendGroupMessageToSF,
  sendEditedIncomingToSF,
  sendEditMSGTOSF,
  sendDelivery,
  updateSFUserLogTime,
  sendGroupParticipantsUpdateToSF,
} from './sfhelper.js';

import {
  getSessionFromValidOrgUser,
  addUserRecord,
  encryptString,
  getOrgString,
  authValidator,
} from './validator.js';

import constants, {
  unipileHeaders,
  sendMsgObj,
  querySF,
  sf_LoginURL,
  authAppURL,
  nodeRefreshTokenUpdateURl,
  createMessageObj,
  sessionIncomingOutgoing,
} from './constants.js';

export {
  // From helper.js
  getMessageTime,
  generateTimeStamp,
  saveUserLogTime,
  isGroupSupported,
  getNumAvailability,
  getGroupName,
  getGroupAvailability,
  manageUnipileLogin,
  manageUnipileLogout,

  // From dbhelper.js
  bulkUpdateNumbersWithFalse,
  bulkUpdateNumbersWithTrue,
  numberUpdateWithTrue,
  numberUpdateWithFalse,
  updateGroup,

  // From apiHelper.js
  handleQRGeneration,
  handlewebhookSetup,
  getAccountStatus,

  // From messageParser.js
  oneToOneMessageParser,
  groupMessageParser,
  editMessageParser,
  deliveryParser,

  // From request.js
  makeRequest,
  getRequest,
  postRequest,
  patchRequest,
  getFileBuffer,
  formDataRequest,

  // From sfhelper.js
  sendSFPendingRec,
  CheckAvailableNumbers,
  getConnectToSf,
  sendMobIncomingOutgoingMsgToSF,
  sendGroupMessageToSF,
  sendEditedIncomingToSF,
  sendEditMSGTOSF,
  sendDelivery,
  updateSFUserLogTime,
  sendGroupParticipantsUpdateToSF,

  // From validator.js
  getSessionFromValidOrgUser,
  addUserRecord,
  encryptString,
  getOrgString,
  authValidator,

  // From constants.js
  constants,
  unipileHeaders,
  sendMsgObj,
  querySF,
  sf_LoginURL,
  authAppURL,
  nodeRefreshTokenUpdateURl,
  createMessageObj,
  sessionIncomingOutgoing,
};
