require("dotenv").config();

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({

  host: process.env.SMTP_HOST,

  port: Number(process.env.SMTP_PORT),

  secure: true,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },

  connectionTimeout: 30000,

  greetingTimeout: 30000,

  socketTimeout: 30000

});

transporter.verify((error, success) => {

  if (error) {

    console.log("EMAIL ERROR:", error);

  } else {

    console.log("SMTP SERVER READY");

  }

});

module.exports = transporter;
