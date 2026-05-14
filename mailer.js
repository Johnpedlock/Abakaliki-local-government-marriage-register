require("dotenv").config();

const axios = require("axios");

async function sendMail(options) {

  try {

    const response = await axios.post(

      "https://api.brevo.com/v3/smtp/email",

      {
        sender: {
          name: "Abakaliki Marriage Register",
          email: "marriageregistryabakalikilocal@gmail.com"
        },

        to: Array.isArray(options.to)
          ? options.to.map(email => ({ email }))
          : [{ email: options.to }],

        subject: options.subject,

        htmlContent: options.html

      },

      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json"
        }
      }

    );

    console.log("EMAIL SENT SUCCESSFULLY");

    console.log("DELIVERY RESPONSE:");

    console.log(JSON.stringify(response.data, null, 2));

    console.log("RECIPIENTS:");

    console.log(options.to);

    return response.data;

  } catch (error) {

    console.log("EMAIL ERROR:");

    console.log(
      error.response?.data || error.message
    );

    throw error;

  }

}

module.exports = {
  sendMail
};
