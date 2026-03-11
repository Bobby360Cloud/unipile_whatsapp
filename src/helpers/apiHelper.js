import QRCode from 'qrcode';
import {makeRequest} from "./request"
import constants,{unipileHeaders} from "./constants"
import { emitStatus } from "../configs/socketconfig"
import userModel from '../models/user.model';

export const handleQRGeneration = async (sessionId) => {
    const url = constants.routes_Url.getQr
    const reqData = {
        method: 'post',
        url: url,
        headers: unipileHeaders,
        data: {
            "provider": "WHATSAPP"
        }
    }
    const qrRes = await makeRequest(reqData);
    console.log("accountDetails =============", qrRes?.data);
    const qrCodeText = qrRes?.data?.checkpoint?.qrcode;
    const qr = await QRCode.toDataURL(qrCodeText);
    if (qr)
        emitStatus(sessionId, { status: 'qr_generated', src: qr });
    else
        emitStatus(sessionId, { status: 'qr_error' });
    if (qr && qrRes?.data?.account_id) {
        await userModel.findOneAndUpdate(
            { sessionId: sessionId },
            {
                $set: {
                    account_id: qrRes.data.account_id
                }
            },
            { upsert: true, new: true }
        );
    }

}