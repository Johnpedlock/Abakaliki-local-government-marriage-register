const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({

  host: process.env.SMTP_HOST,

  port: process.env.SMTP_PORT,

  secure: false,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }

});

transporter.verify((error, success) => {

  if (error) {
    console.log("EMAIL ERROR:", error);
  } else {
    console.log("Brevo email service ready");
  }

});

module.exports = transporter;
