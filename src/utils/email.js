const nodemailer = require("nodemailer");

// Import SendGrid (if installed)
let sgMail;
try {
  sgMail = require("@sendgrid/mail");
} catch (err) {
  // SendGrid not installed, will use nodemailer
}

// Create email transporter
const createTransporter = () => {
  // Priority 1: Use SendGrid if configured
  if (process.env.SENDGRID_API_KEY && sgMail) {
    console.log('✅ Using SendGrid for email delivery');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    return {
      sendMail: async (mailOptions) => {
        try {
          const msg = {
            to: mailOptions.to,
            from: process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER,
            subject: mailOptions.subject,
            text: mailOptions.text,
            html: mailOptions.html,
          };
          
          const response = await sgMail.send(msg);
          console.log(`✅ Email sent via SendGrid to: ${mailOptions.to}`);
          
          return {
            messageId: response[0].headers['x-message-id'],
            accepted: [mailOptions.to],
            response: 'Email sent via SendGrid'
          };
        } catch (error) {
          console.error('❌ SendGrid error:', error.response?.body || error.message);
          throw error;
        }
      }
    };
  }

  // Priority 2: If no SMTP configured, use console logging for development
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log('⚠️  SMTP not configured - using console logging mode');
    return {
      sendMail: async (mailOptions) => {
        console.log('\n📧 ========== EMAIL SENT (DEV MODE) ==========');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('From:', mailOptions.from);
        console.log('\n--- Email Content ---');
        console.log(mailOptions.text || 'No text content');
        if (mailOptions.html) {
          // Extract links from HTML for easy testing
          const linkMatch = mailOptions.html.match(/href="([^"]+)"/);
          if (linkMatch) {
            console.log('\n🔗 Verification/Reset Link:', linkMatch[1]);
          }
        }
        console.log('============================================\n');
        
        return {
          messageId: `dev-${Date.now()}@localhost`,
          accepted: [mailOptions.to],
          response: 'DEV MODE: Email logged to console'
        };
      }
    };
  }

  // Test environment - use ethereal
  if (process.env.NODE_ENV === "test") {
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: {
        user: "test@ethereal.email",
        pass: "test123",
      },
    });
  }

  // Priority 3: Fall back to SMTP (Gmail, etc.)
  console.log('✅ Using real SMTP:', process.env.SMTP_HOST);
  
  const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
  const isSecure = smtpPort === 465; // SSL for port 465, STARTTLS for 587
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: isSecure, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    // Add timeouts and connection settings
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
    // Add TLS options for better compatibility
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      minVersion: 'TLSv1.2'
    },
    // Enable debug output in development
    debug: process.env.NODE_ENV !== 'production',
    logger: process.env.NODE_ENV !== 'production'
  });
};

// Send email function
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `${process.env.TWO_FACTOR_APP_NAME || "Your App"} <${
        process.env.SMTP_USER || "noreply@yourapp.com"
      }>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);

    // Log success
    if (process.env.SMTP_HOST) {
      console.log("✅ Email sent successfully to:", options.to);
      console.log("Message ID:", info.messageId);
    }
    
    // Preview URL for Ethereal
    if (process.env.NODE_ENV === "test") {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    
    // In development without SMTP, don't throw error
    if (!process.env.SMTP_HOST) {
      console.log("⚠️  Continuing without email (development mode)");
      return { messageId: 'dev-fallback', accepted: [options.to] };
    }
    
    throw error;
  }
};

// Email templates
const emailTemplates = {
  welcome: (name) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { background: #f4f4f4; padding: 20px; }
        .button { display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Our Platform!</h1>
        </div>
        <div class="content">
          <p>Hi ${name || "there"},</p>
          <p>Thank you for joining us! We're excited to have you on board.</p>
          <p>To get started, please verify your email address by clicking the button below:</p>
          <p style="text-align: center;">
            <a href="{{verifyLink}}" class="button">Verify Email</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p>{{verifyLink}}</p>
          <p>This link will expire in 24 hours.</p>
        </div>
        <div class="footer">
          <p>If you didn't create this account, please ignore this email.</p>
          <p>&copy; ${new Date().getFullYear()} Your App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  passwordReset: (name) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #FF5722; color: white; padding: 20px; text-align: center; }
        .content { background: #f4f4f4; padding: 20px; }
        .button { display: inline-block; padding: 10px 20px; background: #FF5722; color: white; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hi ${name || "there"},</p>
          <p>You requested to reset your password. Click the button below to proceed:</p>
          <p style="text-align: center;">
            <a href="{{resetLink}}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p>{{resetLink}}</p>
          <div class="warning">
            <strong>⚠️ Important:</strong> This link will expire in 10 minutes for security reasons.
          </div>
          <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Your App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  emailVerified: (name) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { background: #f4f4f4; padding: 20px; text-align: center; }
        .success-icon { font-size: 60px; color: #4CAF50; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Email Verified!</h1>
        </div>
        <div class="content">
          <div class="success-icon">✓</div>
          <h2>Welcome, ${name || "there"}!</h2>
          <p>Your email has been successfully verified.</p>
          <p>You now have full access to all features on our platform.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Your App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,
};

module.exports = {
  sendEmail,
  emailTemplates,
};