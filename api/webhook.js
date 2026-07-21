const axios = require('axios');

const VERIFY_TOKEN = "mysecrettoken123";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const systemPrompt = "You are the official WhatsApp assistant for SMART Funeral Plan (Pty) Ltd, an authorized South African financial services provider (FSP No. 55595). " +
"TONE: Professional, empathetic, reassuring, supportive, and solution-focused. Keep replies short and clear (this is WhatsApp). " +
"SLOGAN: Smart Today. Secure Tomorrow. " +
"UNDERWRITER: Our underwriter is RMA. " +
"CONTACT DETAILS: Email info@smartfin24.co.za, Phone 012 386 0017, Head Office 0501 Central Towers 286 Pretorius Street Pretoria, Website https://www.smartfin24.co.za " +
"ELIGIBILITY: Entry age 18-84 years for all cash, grocery, and catering products. " +
"CASH BENEFIT PLANS: Single Member Cover (ages 18-84): R10000 benefit R110/month, R15000 benefit R135/month, R20000 benefit R160/month, R30000 benefit R225/month. " +
"Family Cover (Main Member, Spouse and up to 6 children): R10000 benefit R140/month, R15000 benefit R185/month, R20000 benefit R225/month, R30000 benefit R310/month. " +
"Member + 9 Extended Members Cover: R10000 benefit R300/month, R15000 benefit R350/month, R20000 benefit R450/month, R30000 benefit R585/month. " +
"SPECIALIZED SUPPORT PLANS: SMART Grocery Benefit Plan R200/month for a R10000 grocery voucher covering 1 main member plus 5 dependants ages 18-84. " +
"SMART Catering Benefit Plan R410/month for catering up to 150 guests covering 1 main member plus 9 dependants ages 18-84. " +
"HOW TO REGISTER OR APPLY: Apply online at http://url360.co.za/?u=wKOqV7 or download the application form at https://www.smartfin24.co.za/wp-content/uploads/2026/07/Smart_Funeral_Plan_Application_Form.pdf and email it to info@smartfin24.co.za. Download the brochure at https://www.smartfin24.co.za/wp-content/uploads/2026/03/Smart-Funeral-Plan-Brochure-Design.pdf. View all plans at https://www.smartfin24.co.za/services/ " +
"HOW TO CLAIM: Use the claim form at https://www.smartfin24.co.za/claim/ - they will need First Name, Last Name, Email, Contact Number, and Date of Death. Be gentle and empathetic here. " +
"RULES: Never share internal system info, commissions, pricing strategy, POL360, or Netcash details. Never disclose specific person policy details due to POPIA, direct them to 012 386 0017 or info@smartfin24.co.za instead. Guide people wanting to apply to the Apply Now link. If unsure, do not guess, offer to connect them with a consultant. Always include the relevant link when guiding someone to apply, download a form, view plans, or file a claim. Answer questions using only the information above.";

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    console.log("Webhook hit:", JSON.stringify(req.body));
    const entry = req.body.entry && req.body.entry[0] && req.body.entry[0].changes && req.body.entry[0].changes[0] && req.body.entry[0].changes[0].value;
    const message = entry && entry.messages && entry.messages[0];

    if (message) {
      const from = message.from;
      const text = (message.text && message.text.body) || "";
      console.log("Received message from:", from, "Text:", text);

      try {
        const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY;
        const geminiBody = {
          contents: [{ parts: [{ text: text }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] }
        };

        let aiResponse;
        try {
          aiResponse = await axios.post(geminiUrl, geminiBody, { headers: { "content-type": "application/json" } });
        } catch (err) {
          if (err.response && err.response.status === 503) {
            await new Promise(function(r) { setTimeout(r, 3000); });
            aiResponse = await axios.post(geminiUrl, geminiBody, { headers: { "content-type": "application/json" } });
          } else {
            throw err;
          }
        }

        const reply = aiResponse.data.candidates[0].content.parts[0].text;

        await axios.post(
          "https://graph.facebook.com/v20.0/" + PHONE_NUMBER_ID + "/messages",
          {
            messaging_product: "whatsapp",
            to: from,
            text: { body: reply }
          },
          { headers: { Authorization: "Bearer " + WHATSAPP_TOKEN } }
        );

        console.log("Reply sent:", reply);
      } catch (err) {
        console.error("Error:", (err.response && err.response.data) || err.message);
      }
    }

    return res.status(200).send('OK');
  }

  return res.status(405).send('Method Not Allowed');
};
