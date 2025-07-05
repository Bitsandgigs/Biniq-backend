const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config({ path: "./../../.env" });
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendMail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: `"BinIQ" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error("Error sending email:", {
      message: error.message,
      code: error.code,
      response: error.response,
    });
    throw error;
  }
};

module.exports = { sendMail };
