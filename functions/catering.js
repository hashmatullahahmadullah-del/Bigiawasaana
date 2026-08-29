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
    
    let gmailEmail = process.env.GMAIL_EMAIL;
    let gmailPassword = process.env.GMAIL_PASSWORD;
    try { if (functions.config().gmail) { gmailEmail = functions.config().gmail.email || gmailEmail; gmailPassword = functions.config().gmail.password || gmailPassword; } } catch(e){ /* ignore config error */ }
    

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
