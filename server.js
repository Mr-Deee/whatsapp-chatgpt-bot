const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Webhook Verification Endpoint
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "EAAZANftIfU2QBOZBoHrbOkx8Y766EeZASqYmS1nHqW5DHSIlIS5DNRUvpWRYHwkpbcfmYTDTWtaQ2tBhrR3MFosZCjKKvNzhNYWZCZBv3QA06SaV7xKfeEuT7GvYesQqbt3TW0K4aZCQSmgkgQyewusSZA5YxF8R7br9vA0HPts6VCijEoO33WtyjQqjZB0Bb9u1s6gZDZD";

    // Extract query parameters from Meta's request
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified successfully');
        res.status(200).send(challenge); // Respond with the challenge
    } else {
        console.error('Webhook verification failed');
        res.status(403).send('Forbidden');
    }
});

// Handle Incoming Messages
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.entry && body.entry[0].changes[0].value.messages) {
        const message = body.entry[0].changes[0].value.messages[0];
        const from = message.from; // Sender's phone number
        const text = message.text.body; // Message content

        console.log(`Received message from ${from}: ${text}`);

        try {
            // Get response from ChatGPT
            const chatGPTResponse = await getChatGPTResponse(text);

            // Send response back to WhatsApp
            await sendWhatsAppMessage(from, chatGPTResponse);
            res.status(200).send('Message processed');
        } catch (error) {
            console.error('Error processing message:', error.message);
            res.status(500).send('Error processing message');
        }
    } else {
        console.error('No messages found in webhook payload');
        res.status(404).send('No messages found');
    }
});

// ChatGPT Integration
async function getChatGPTResponse(userMessage) {
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4",
            messages: [{ role: "user", content: userMessage }]
        }, {
            headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error communicating with ChatGPT:', error.message);
        throw error;
    }
}

// WhatsApp Message Sender
async function sendWhatsAppMessage(to, message) {
    try {
        const url = `https://graph.facebook.com/v15.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
        await axios.post(url, {
            messaging_product: "whatsapp",
            to,
            text: { body: message }
        }, {
            headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` }
        });
        console.log(`Message sent to ${to}`);
    } catch (error) {
        console.error('Error sending message to WhatsApp:', error.message);
        throw error;
    }
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
