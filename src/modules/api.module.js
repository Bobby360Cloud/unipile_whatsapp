import axios from 'axios';


const apiCall = async (method, endpoint, data = null) => {
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

const createWhatsAppSession = async (name) => {
    return await apiCall('post', '/accounts', {
        type: 'whatsapp',
        name,
    });
};

const getWhatsAppSession = async (sessionId) => {
    return await apiCall('get', `/accounts/${sessionId}`);
};
