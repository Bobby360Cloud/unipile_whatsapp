import axios from 'axios';
import { unipileHeaders } from './constants';


export async function makeRequest(req) {
    try {
        const { method, url, headers, data, responseType} = req;
        const config = {
            method: method || 'get',  
            url: url,
            headers: headers || {},     
        };
        if(responseType){
            config.responseType = responseType
        }
        if(method=='post' || method=='patch') config['data']=data || {};
        console.log("request body ======" , config);
        let response = await axios(config);
        return response;
    } catch (error) {
        console.error('Error making request:', error.message);
        if (error.response) {
            console.error('Response error:', error.response.data); // Log server response
        } else if (error.request) {
            console.error('No response from server:', error.request); 
        } else {
            console.error('Request error:', error.message);
        }
        return error;
    }
}




export const getRequest = async function (headers, url) {

    const resp = await axios({
        headers,
        method: "get",
        url: url
    })
        .then(function (response) {
            return response;
        })
        .catch(function (error) {
            return error;
        });
    return resp;
};

export const postRequest = async function (headers, url, data = {}) {

    const resp = await axios({
        headers,
        method: "post",
        url: url,
        data: data,
    })
        .then(function (response) {
            return response;
        })
        .catch(function (error) {
            return error;
        });
    return resp;
};

export const patchRequest = async function (headers, url, data = {}) {
    const resp = await axios({
        headers,
        method: "patch",
        url: url,
        data: data
    }).then(function (res) {
        return res;
    }).catch(function (err) {
        return err;
    });
    return resp;
}

export async function getFileBuffer(cdnUrl) {
    try {
    
      const response = await axios.get(cdnUrl, {
        responseType: 'arraybuffer',  
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error fetching the file:', error?.message);
      throw null; 
    }
}

export const formDataRequest = async function (headers, url, formData) {
    console.log("formDataRequest,,,,,,,,,,,");
    const resp = await axios.post(
            url,
            formData,
            {
                headers,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        )
        .then(function (response) {
            return response;
        })
        .catch(function (error) {
            return error;
        });
    return resp;
}


export default makeRequest;