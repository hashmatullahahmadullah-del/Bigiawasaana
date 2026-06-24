/**
 * Generates an HTML email for Catering Inquiries matching the Bigi Awasaana UI
 * @param {Object} data - The catering inquiry data
 */
exports.generateCateringEmail = (data) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Catering Inquiry</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0d0d0d;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #ffffff;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0d0d0d;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #1a1a1a;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #333333;
    }
    .header {
      background-color: #000000;
      padding: 30px;
      text-align: center;
      border-bottom: 2px solid #ff4500;
    }
    .header img {
      height: 60px;
      width: auto;
    }
    .content {
      padding: 40px 30px;
    }
    .title {
      color: #ff4500;
      font-size: 24px;
      font-weight: bold;
      margin-top: 0;
      margin-bottom: 30px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .detail-card {
      background-color: #222222;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .detail-row {
      margin-bottom: 16px;
    }
    .detail-row:last-child {
      margin-bottom: 0;
    }
    .detail-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888888;
      margin-bottom: 4px;
      display: block;
    }
    .detail-value {
      font-size: 18px;
      color: #ffffff;
      margin: 0;
      font-weight: 500;
    }
    .message-box {
      background-color: #2a2a2a;
      border-left: 4px solid #ff4500;
      padding: 16px;
      color: #dddddd;
      font-style: italic;
      line-height: 1.6;
      border-radius: 0 4px 4px 0;
    }
    .footer {
      background-color: #000000;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #333333;
    }
    .footer p {
      color: #888888;
      font-size: 12px;
      margin: 0;
    }
    .footer a {
      color: #ff4500;
      text-decoration: none;
    }
    .button {
      display: inline-block;
      background-color: #ff4500;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="https://bigiawasaana.com" target="_blank">
          <!-- Always use absolute URLs in emails -->
          <img src="https://bigiawasaana.com/logo.png" alt="Bigi Awasaana">
        </a>
      </div>
      
      <div class="content">
        <h1 class="title">New Catering Inquiry</h1>
        
        <div class="detail-card">
          <div class="detail-row">
            <span class="detail-label">Name</span>
            <p class="detail-value">${data.name}</p>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Email</span>
            <p class="detail-value">
              <a href="mailto:${data.email}" style="color: #ff4500; text-decoration: none;">${data.email}</a>
            </p>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Phone</span>
            <p class="detail-value">
              <a href="tel:${data.phone}" style="color: #ffffff; text-decoration: none;">${data.phone}</a>
            </p>
          </div>
        </div>

        <div class="detail-card">
          <div class="detail-row">
            <span class="detail-label">Event Date</span>
            <p class="detail-value">${data.date}</p>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Number of Guests</span>
            <p class="detail-value">${data.guests}</p>
          </div>
        </div>

        ${data.details ? `
        <div class="detail-row">
          <span class="detail-label">Event Details / Requests</span>
          <div class="message-box">
            ${data.details}
          </div>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="mailto:${data.email}" class="button">Reply to Customer</a>
        </div>
      </div>
      
      <div class="footer">
        <p>This automated email was sent from the <a href="https://bigiawasaana.com/catering.html">Bigi Awasaana Catering Form</a>.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};
