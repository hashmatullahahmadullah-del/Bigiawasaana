const { functions } = require('./shared');
const nodemailer = require('nodemailer');
const { generateCateringEmail } = require('./emailTemplate');

// ─────────────────────────────────────────────────────────────────
// Email Notification for Catering Inquiries
// ─────────────────────────────────────────────────────────────────
exports.onNewCateringInquiry = functions.firestore
  .document('catering_inquiries/{inquiryId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    
    const gmailEmail = functions.config().gmail ? functions.config().gmail.email : process.env.GMAIL_EMAIL;
    const gmailPassword = functions.config().gmail ? functions.config().gmail.password : process.env.GMAIL_PASSWORD;

    if (!gmailEmail || !gmailPassword) {
      console.error('Missing Gmail credentials. Run: firebase functions:config:set gmail.email="your@gmail.com" gmail.password="app_password"');
      return null;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailEmail,
        pass: gmailPassword
      }
    });

    const mailOptions = {
      from: `"Bigi Awasaana Catering" <${gmailEmail}>`,
      to: 'bigiawasaanallc@gmail.com',
      replyTo: data.email,
      subject: `New Catering Inquiry from ${data.name}`,
      html: generateCateringEmail(data)
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Catering notification email sent for inquiry:', context.params.inquiryId);
    } catch (error) {
      console.error('Error sending catering email:', error);
    }

    return null;
  });
