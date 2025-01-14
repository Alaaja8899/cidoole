const makeWASocket = require('@whiskeysockets/baileys').default;
const { DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const Boom = require('@hapi/boom');
const qrcode = require('qrcode-terminal'); // Add qrcode-terminal
const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.API_KEY
});

// Generate a response from OpenAI
async function generateResponse(prompt) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o", // Token-efficient model
            messages: [
                { "role": "system", "content": 
                    `
                You are an AI assistant bot for Ciidoole company, a 1xbt exchange.
                
                Your purpose is to assist users with their inquiries related to the exchange,
                 provide information, and help resolve any issues they might have. Always be polite,
                  concise, and provide accurate information in the Somali language.

                  ask how much customer wanna exchange (if 1$ = 1$ soo on...) and finally when the if tells you a price exchange say we exchange you soon 
                    if customer ask for contact to manager only link to this number :  615221122

                if (cusomer ask where to send money ){
                    Hab Dirista lacagta sarifka: 
                        Golis*884*068809426*lacagta#
                        Telesom*883*068809426*lacagta#
                        Evc *789*809426*lacagta#
                        JEEP *818*809426*lacagta#
                }
                

                    `
                },
                { "role": "user", "content": prompt }
            ]
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error("Error generating response:", error);
        return "Sorry, there was an issue generating a response.";
    }
}

// Load auth state (creds and keys)
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');  // Save creds in the 'auth_info' folder

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    });

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // Generate and display QR code if provided
        if (qr) {
            qrcode.generate(qr, { small: true });  // Display QR code in the terminal
        }

        if (connection === 'close') {
            const shouldReconnect = Boom.isBoom(lastDisconnect.error) && lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;
            // console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();  // Reconnect if not logged out
            }
        } else if (connection === 'open') {
            // console.log('opened connection');
        }
    });

    // Handle credentials update and persist them
    sock.ev.on('creds.update', saveCreds);

    // Handle incoming messages
    sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0];
        if (!message.message || message.key.fromMe) return; // Ignore if there's no message or if it's from the bot itself

        const userId = message.key.remoteJid;
        const prompt = message.message.conversation || message.message.extendedTextMessage?.text || '';

        // Generate AI response
        const responseText = await generateResponse(prompt);

        // Send the AI response back to the user
        await sock.sendMessage(userId, { text: responseText });
    });
}

// Run WhatsApp connection on app startup
connectToWhatsApp();

const express = require("express")
const app=express()

const port = 3000

app.get('/',(req ,res)=>{
    res.send("Ciidoole Whatsapp  Ai bot is alive !")
})


app.listen(port , ()=>{
    console.log(`Server running on port ${port}`)
})