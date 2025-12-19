import axios from 'axios';


export const apiCall = async (method, endpoint, data = null) => {
    try {
        const response = await axios({
            method,
            url: endpoint,
            data,
        });
        return response.data;
    } catch (error) {
        console.error("API call error:", error);
        throw error;
    }
};

export async function makeRequest(req) {
    try {
        const { method, url, headers, data } = req;
        const config = {
            method: method || 'get',  
            url: url,
            headers: headers || {}       
        };
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

