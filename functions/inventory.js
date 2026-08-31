const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

exports.checkInventoryDeadlinesCron = functions.pubsub.schedule('every day 08:00').onRun(async (context) => {
    const db = admin.firestore();
    
    // Configure nodemailer transporter using environment variables or firebase config
    const smtpEmail = process.env.SMTP_EMAIL || (functions.config().smtp && functions.config().smtp.email) || "";
    const smtpPassword = process.env.SMTP_PASSWORD || (functions.config().smtp && functions.config().smtp.password) || "";
    const notificationEmail = process.env.NOTIFICATION_EMAIL || (functions.config().smtp && functions.config().smtp.notification_email) || smtpEmail;

    if (!smtpEmail || !smtpPassword) {
        console.warn("SMTP_EMAIL or SMTP_PASSWORD not set. Cannot send inventory alerts.");
        return null;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: {
            user: smtpEmail,
            pass: smtpPassword
        }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    const inventoryRef = db.collection('inventory');
    const snapshot = await inventoryRef.get();
    
    let itemsToAlert = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.deadline) {
            const deadlineDate = new Date(data.deadline);
            // check if deadlineDate is less than or equal to 3 days from now
            if (deadlineDate <= threeDaysFromNow) {
                 itemsToAlert.push(data);
            }
        }
    });
    
    if (itemsToAlert.length > 0) {
        let htmlList = itemsToAlert.map(item => `<li><b>${item.name}</b> (Category: ${item.category || 'N/A'}): Needed by <b>${item.deadline}</b> (Current Stock: ${item.stockQuantity || 0})</li>`).join('');
        
        const mailOptions = {
            from: smtpEmail,
            to: notificationEmail,
            subject: `Inventory Alert: Items needed soon!`,
            html: `
              <h3>Inventory Deadline Alert</h3>
              <p>The following items are approaching their deadline and are needed soon:</p>
              <ul>${htmlList}</ul>
              <p>Please check the inventory dashboard to update stock levels once acquired.</p>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`Email sent successfully to ${notificationEmail}! Alerted for ${itemsToAlert.length} items.`);
        } catch (error) {
            console.error("Error sending email: ", error);
        }
    } else {
        console.log("No items need alerting today.");
    }
    
    return null;
});
