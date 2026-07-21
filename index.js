const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = "mysecrettoken123";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  const entry = req.body.entry?.[0]?.changes?.[0]?.value;
  const message = entry?.messages?.[0];

  if (message) {
    const from = message.from;
    const text = message.text?.body || "";
    const reply = `You said: ${text}`;

    await axios.post(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: reply }
      },
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
  }

  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => console.log("Bot running"));
