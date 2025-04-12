import { MailService } from '@sendgrid/mail';

// Initialize SendGrid mail service
const mailService = new MailService();
if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY is not set. Email functionality will not work.");
} else {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

// Default sender email address
const DEFAULT_FROM_EMAIL = 'noreply@snaptheplant.com';

// Email templates
export const EmailTemplates = {
  TRIAL_STARTED: 'trial_started',
  TRIAL_ENDING: 'trial_ending',
  SUBSCRIPTION_CONFIRMATION: 'subscription_confirmation',
  PRO_PACK_DOWNLOAD: 'pro_pack_download',
};

// Interface for all emails
interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
  fromEmail?: string;
}

/**
 * Send an email using SendGrid
 * @param params Email parameters
 * @returns Promise resolving to success status
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn("Email not sent: SENDGRID_API_KEY is not set");
      return false;
    }

    await mailService.send({
      to: params.to,
      from: params.fromEmail || DEFAULT_FROM_EMAIL,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

/**
 * Send a trial started email
 * @param to Recipient email
 * @param trialEndDate Date when trial ends
 * @returns Promise resolving to success status
 */
export async function sendTrialStartedEmail(to: string, trialEndDate: Date): Promise<boolean> {
  const formattedDate = trialEndDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const subject = 'Welcome to Your SnapThePlant Premium Trial!';
  const text = `
    Hello Plant Enthusiast!

    Your SnapThePlant premium trial has been activated!
    
    You now have full access to all premium features including:
    - Unlimited plant identifications
    - Advanced care tracking
    - Community sharing capabilities
    - And more!
    
    Your trial will end on ${formattedDate}. Make the most of it by exploring all our premium features!
    
    Happy Planting!
    The SnapThePlant Team
  `;
  
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
      <h2 style="color: #4CAF50;">Welcome to Your SnapThePlant Premium Trial!</h2>
      <p>Hello Plant Enthusiast!</p>
      <p>Your SnapThePlant premium trial has been activated!</p>
      
      <p>You now have full access to all premium features including:</p>
      <ul>
        <li>Unlimited plant identifications</li>
        <li>Advanced care tracking</li>
        <li>Community sharing capabilities</li>
        <li>And more!</li>
      </ul>
      
      <p><strong>Your trial will end on ${formattedDate}.</strong> Make the most of it by exploring all our premium features!</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #EEEEEE;">
        <p>Happy Planting!<br>The SnapThePlant Team</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to,
    subject,
    text,
    html
  });
}

/**
 * Send a trial ending reminder email
 * @param to Recipient email
 * @param daysRemaining Number of days remaining in trial
 * @returns Promise resolving to success status
 */
export async function sendTrialEndingEmail(to: string, daysRemaining: number): Promise<boolean> {
  const subject = `Your SnapThePlant Trial Ends in ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'}`;
  const text = `
    Hello Plant Enthusiast!

    Your SnapThePlant premium trial is ending in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}.
    
    Don't miss out on our premium features:
    - Unlimited plant identifications
    - Advanced care tracking
    - Community sharing capabilities
    
    Upgrade now to keep enjoying these features without interruption!
    
    Visit snaptheplant.com/subscribe to continue your premium journey.
    
    Happy Planting!
    The SnapThePlant Team
  `;
  
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
      <h2 style="color: #FF9800;">Your SnapThePlant Trial Ends in ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'}</h2>
      <p>Hello Plant Enthusiast!</p>
      <p>Your SnapThePlant premium trial is ending in <strong>${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}</strong>.</p>
      
      <p>Don't miss out on our premium features:</p>
      <ul>
        <li>Unlimited plant identifications</li>
        <li>Advanced care tracking</li>
        <li>Community sharing capabilities</li>
      </ul>
      
      <p><a href="https://snaptheplant.com/subscribe" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Upgrade Now</a></p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #EEEEEE;">
        <p>Happy Planting!<br>The SnapThePlant Team</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to,
    subject,
    text,
    html
  });
}

/**
 * Send a subscription confirmation email
 * @param to Recipient email
 * @param isMonthly Whether it's a monthly subscription or lifetime
 * @returns Promise resolving to success status
 */
export async function sendSubscriptionConfirmationEmail(to: string, isMonthly: boolean): Promise<boolean> {
  const subject = 'Thank You for Your SnapThePlant Subscription!';
  const text = `
    Hello Plant Enthusiast!

    Thank you for subscribing to SnapThePlant Premium${isMonthly ? ' Monthly' : ' Lifetime'}!
    
    You now have unlimited access to all premium features:
    - Unlimited plant identifications
    - Advanced care tracking
    - Community sharing capabilities
    - And much more!
    
    ${isMonthly ? 'Your subscription will automatically renew each month. You can manage your subscription at any time from your account settings.' : 'Your lifetime subscription never expires, so you can enjoy premium features forever!'}
    
    Happy Planting!
    The SnapThePlant Team
  `;
  
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
      <h2 style="color: #4CAF50;">Thank You for Your SnapThePlant Subscription!</h2>
      <p>Hello Plant Enthusiast!</p>
      <p>Thank you for subscribing to SnapThePlant Premium${isMonthly ? ' Monthly' : ' Lifetime'}!</p>
      
      <p>You now have unlimited access to all premium features:</p>
      <ul>
        <li>Unlimited plant identifications</li>
        <li>Advanced care tracking</li>
        <li>Community sharing capabilities</li>
        <li>And much more!</li>
      </ul>
      
      <p>${isMonthly ? 'Your subscription will automatically renew each month. You can manage your subscription at any time from your account settings.' : 'Your lifetime subscription never expires, so you can enjoy premium features forever!'}</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #EEEEEE;">
        <p>Happy Planting!<br>The SnapThePlant Team</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to,
    subject,
    text,
    html
  });
}

/**
 * Send a Pro Pack download email with download link
 * @param to Recipient email
 * @param downloadLink Link to download the Pro Pack
 * @returns Promise resolving to success status
 */
export async function sendProPackDownloadEmail(to: string, downloadLink: string): Promise<boolean> {
  const subject = 'Your SnapThePlant Pro Pack is Ready to Download!';
  const text = `
    Hello Plant Enthusiast!

    Your SnapThePlant Pro Pack is ready for download!
    
    Download Link: ${downloadLink}
    
    The Pro Pack includes:
    - Plant identification guide
    - Seasonal care calendar
    - Common plant diseases handbook
    - Plant nutrition guide
    
    Thank you for being a premium member!
    
    Happy Planting!
    The SnapThePlant Team
    
    Note: This download link will expire in 24 hours.
  `;
  
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
      <h2 style="color: #4CAF50;">Your SnapThePlant Pro Pack is Ready!</h2>
      <p>Hello Plant Enthusiast!</p>
      <p>Your SnapThePlant Pro Pack is ready for download!</p>
      
      <p>
        <a href="${downloadLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Download Pro Pack</a>
      </p>
      
      <p>The Pro Pack includes:</p>
      <ul>
        <li>Plant identification guide</li>
        <li>Seasonal care calendar</li>
        <li>Common plant diseases handbook</li>
        <li>Plant nutrition guide</li>
      </ul>
      
      <p><em>Note: This download link will expire in 24 hours.</em></p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #EEEEEE;">
        <p>Happy Planting!<br>The SnapThePlant Team</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to,
    subject,
    text,
    html
  });
}