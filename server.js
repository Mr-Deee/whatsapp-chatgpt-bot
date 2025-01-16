const express = require('express');
const axios = require('axios');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

// Load the WhatsApp certificate
const certPath = process.env.WHATSAPP_CERT_PATH;
const cert = fs.readFileSync(certPath);

// WhatsApp Webhook Endpoint
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body && body.messages) {
        const userMessage = body.messages[0].text.body;
        const userPhone = body.messages[0].from;

        try {
            // Generate ChatGPT Response
            const chatGPTResponse = await getChatGPTResponse(userMessage);

            // Send Message to WhatsApp
            await sendWhatsAppMessage(userPhone, chatGPTResponse);

            return res.status(200).send('Message processed');
        } catch (error) {
            console.error('Error:', error);
            return res.status(500).send('Internal Server Error');
        }
    } else {
        res.status(400).send('No message found');
    }
});

// Generate Response with ChatGPT
async function getChatGPTResponse(message) {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4",
        messages: [{ role: "user", content: message }]
    }, {
        headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });
    return response.data.choices[0].message.content;
}

// Send WhatsApp Message
async function sendWhatsAppMessage(to, message) {
    const url = `${process.env.WHATSAPP_API_URL}/v15.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    await axios.post(url, {
        messaging_product: 'whatsapp',
        to,
        text: { body: message }
    }, {
        headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'Certificate': cert
        }
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
