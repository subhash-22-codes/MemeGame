from datetime import datetime
import os
import requests
import logging

logger = logging.getLogger(__name__)

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
MAIL_FROM_EMAIL = os.getenv("MAIL_FROM_EMAIL")
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "MemeGame")


def get_thank_you_email(name, message):
    return f"""
    <html>
      <head>
        <style>
          @media only screen and (max-width: 600px) {{
            .container {{
              padding: 1rem !important;
            }}
          }}
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f9f9f9;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; padding: 2rem 0;">
          <tr>
            <td align="center">
              <table class="container" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); overflow: hidden; padding: 2rem;">
                <tr>
                  <td align="center" style="padding-bottom: 1rem;">
                    <h1 style="margin: 0; color: #5F8B4C; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">MemeGame</h1>
                    <p style="margin: 0; font-size: 0.9em; color: #888;">Thank you for contacting us!</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top: 1.5rem;">
                    <p style="font-size: 1.05em; line-height: 1.6; color: #333;">
                      Hi <strong>{name}</strong>,
                    </p>
                    <p style="font-size: 1.05em; line-height: 1.6; color: #333;">
                      We've received your message and are excited to hear from you. Here's what you wrote:
                    </p>

                    <div style="margin: 1rem 0; padding: 1rem; background-color: #f0f5f0; border-left: 4px solid #5F8B4C; font-style: italic; color: #444; border-radius: 8px;">
                      {message}
                    </div>

                    <p style="font-size: 1.05em; color: #333;">
                      Our team will review your message and get back to you as soon as possible. Stay tuned! ✨
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top: 2rem; font-size: 0.9em; color: #999;">
                    <hr style="border: none; border-top: 1px solid #eee; margin: 2rem 0;">
                    <p style="margin: 0;">Warm regards,</p>
                    <p style="margin: 0;"><strong>The MemeGame Team</strong></p>
                    <p style="margin-top: 0.5rem; font-size: 0.8em; color: #bbb;">
                      © {datetime.now().year} MemeGame, All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """
    
def get_professional_otp_template(otp, user_name=None, company_name="MemeGame"):
    """Generate beautiful, responsive HTML email template for OTP"""
    greeting_name = user_name if user_name else "User"
    
    html_template = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - {company_name}</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333333;
                background-color: #f8fafc;
            }}
            
            .email-container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            }}
            
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 30px;
                text-align: center;
                color: white;
            }}
            
            .header h1 {{
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 8px;
                letter-spacing: -0.5px;
            }}
            
            .header p {{
                font-size: 16px;
                opacity: 0.9;
                margin: 0;
            }}
            
            .content {{
                padding: 40px 30px;
            }}
            
            .greeting {{
                font-size: 18px;
                font-weight: 600;
                color: #1a202c;
                margin-bottom: 20px;
            }}
            
            .message {{
                font-size: 16px;
                color: #4a5568;
                margin-bottom: 30px;
                line-height: 1.7;
            }}
            
            .otp-container {{
                background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
                border: 2px dashed #cbd5e0;
                border-radius: 12px;
                padding: 30px;
                text-align: center;
                margin: 30px 0;
            }}
            
            .otp-label {{
                font-size: 14px;
                font-weight: 600;
                color: #718096;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 15px;
            }}
            
            .otp-code {{
                font-size: 36px;
                font-weight: 800;
                color: #667eea;
                font-family: 'Courier New', monospace;
                letter-spacing: 8px;
                margin: 15px 0;
                text-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
            }}
            
            .otp-note {{
                font-size: 13px;
                color: #a0aec0;
                margin-top: 15px;
            }}
            
            .security-notice {{
                background-color: #fef5e7;
                border-left: 4px solid #f6ad55;
                padding: 20px;
                margin: 30px 0;
                border-radius: 0 8px 8px 0;
            }}
            
            .security-notice h3 {{
                font-size: 16px;
                font-weight: 600;
                color: #c05621;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
            }}
            
            .security-notice p {{
                font-size: 14px;
                color: #9c4221;
                margin: 0;
                line-height: 1.6;
            }}
            
            .footer {{
                background-color: #f7fafc;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }}
            
            .footer p {{
                font-size: 14px;
                color: #718096;
                margin-bottom: 15px;
            }}
            
            .divider {{
                height: 1px;
                background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
                margin: 30px 0;
            }}
            
            .help-section {{
                background-color: #f0fff4;
                border: 1px solid #9ae6b4;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                text-align: center;
            }}
            
            .help-section h4 {{
                font-size: 16px;
                font-weight: 600;
                color: #22543d;
                margin-bottom: 10px;
            }}
            
            .help-section p {{
                font-size: 14px;
                color: #2f855a;
                margin: 0;
            }}
            
            .help-section a {{
                color: #38a169;
                text-decoration: none;
                font-weight: 600;
            }}
            
            @media only screen and (max-width: 600px) {{
                .email-container {{
                    margin: 10px;
                    border-radius: 8px;
                }}
                
                .header, .content, .footer {{
                    padding: 25px 20px;
                }}
                
                .otp-code {{
                    font-size: 28px;
                    letter-spacing: 4px;
                }}
                
                .header h1 {{
                    font-size: 24px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <!-- Header -->
            <div class="header">
                <h1>🔐 {company_name}</h1>
                <p>Secure Password Reset</p>
            </div>
            
            <!-- Main Content -->
            <div class="content">
                <div class="greeting">Hello {greeting_name}! 👋</div>
                
                <div class="message">
                    We received a request to reset your password. To proceed with the password reset, 
                    please use the verification code below. This code is valid for <strong>5 minutes</strong> only.
                </div>
                
                <!-- OTP Section -->
                <div class="otp-container">
                    <div class="otp-label">Your Verification Code</div>
                    <div class="otp-code">{otp}</div>
                    <div class="otp-note">Enter this code in the password reset form</div>
                </div>
                
                <!-- Security Notice -->
                <div class="security-notice">
                    <h3>🛡️ Security Notice</h3>
                    <p>
                        If you didn't request this password reset, please ignore this email. 
                        Your account remains secure and no changes have been made.
                    </p>
                </div>
                
                <div class="divider"></div>
                
                <!-- Help Section -->
                <div class="help-section">
                    <h4>Need Help?</h4>
                    <p>
                        If you're having trouble with the password reset process, 
                        <a href="mailto:support@memegame.com">contact our support team</a> 
                        and we'll be happy to assist you.
                    </p>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p>This email was sent by {company_name} Security Team</p>
                <p>© 2024 {company_name}. All rights reserved.</p>
                
                <p style="font-size: 12px; color: #a0aec0; margin-top: 20px;">
                    You received this email because you requested a password reset for your {company_name} account.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html_template

def get_plain_text_template(otp, user_name=None, company_name="MemeGame"):
    """Generate plain text version for email clients that don't support HTML"""
    greeting_name = user_name if user_name else "User"
    
    plain_text = f"""
{company_name} - Password Reset Verification

Hello {greeting_name}!

We received a request to reset your password. To proceed with the password reset, please use the verification code below:

VERIFICATION CODE: {otp}

This code is valid for 5 minutes only.

SECURITY NOTICE:
If you didn't request this password reset, please ignore this email. Your account remains secure and no changes have been made.

Need help? Contact our support team at support@memegame.com

Best regards,
{company_name} Security Team

© 2024 {company_name}. All rights reserved.

You received this email because you requested a password reset for your {company_name} account.
    """
    
    return plain_text.strip()

def get_registration_otp_template(otp: str, user_name: str | None = None, company_name: str = "MemeGame") -> str:
    """Registration OTP email with a welcoming tone."""
    display_name = user_name or "there"
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Welcome to {company_name}!</title>
      <style>
        body {{ font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif; background:#f8fafc; color:#1a202c; margin:0; }}
        .card {{ max-width: 640px; margin: 24px auto; background:#fff; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.08); overflow:hidden; }}
        .header {{ background: linear-gradient(135deg,#5F8B4C,#D98324); color:#fff; padding: 28px 24px; text-align:center; }}
        .content {{ padding: 28px 24px; }}
        .otp {{ letter-spacing: 8px; font-weight: 800; font-size: 32px; color:#5F8B4C; text-align:center; margin: 16px 0; }}
        .note {{ text-align:center; color:#4a5568; font-size:14px; }}
        .footer {{ padding: 18px 24px; background:#f7fafc; text-align:center; color:#718096; font-size: 13px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🎉 Welcome to {company_name}!</h1>
          <p>Hi {display_name}, let's verify your email to get started.</p>
        </div>
        <div class="content">
          <p>Use the code below to complete your signup. It expires in <strong>5 minutes</strong>.</p>
          <div class="otp">{otp}</div>
          <p class="note">If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div class="footer">© {datetime.now().year} {company_name}. All rights reserved.</div>
      </div>
    </body>
    </html>
    """


def send_brevo_email(to_email: str, subject: str, html_content: str):
    payload = {
        "sender": {
            "name": MAIL_FROM_NAME,
            "email": MAIL_FROM_EMAIL
        },
        "to": [
            {
                "email": to_email
            }
        ],
        "subject": subject,
        "htmlContent": html_content
    }

    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }

    response = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        json=payload,
        headers=headers
    )

    if response.status_code in (200, 201):
        return True, "Email sent successfully"

    logger.error(response.text)
    return False, response.text


def send_registration_otp_email(to_email: str, otp: str, user_name: str | None = None):
    try:
        now_str = datetime.now().strftime("%A %d %b %Y, %I:%M %p")

        subject = f"Welcome to MemeGame 🎉 | Verify your email ({now_str})"

        html_content = get_registration_otp_template(
            otp,
            user_name,
            "MemeGame"
        )

        return send_brevo_email(to_email, subject, html_content)

    except Exception as e:
        logger.error(f"Failed to send registration OTP email: {str(e)}")
        return False, str(e)


def send_professional_otp_email(to_email, otp, user_name=None):
    try:
        now_str = datetime.now().strftime("%A %d %b %Y, %I:%M %p")

        subject = f"🔐 MemeGame - Password Reset Code ({now_str})"

        html_content = get_professional_otp_template(
            otp,
            user_name,
            "MemeGame"
        )

        return send_brevo_email(to_email, subject, html_content)

    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False, str(e)


def send_email(to_email, subject, body):
    username = to_email.split('@')[0]

    if "{username}" in body:
        username = body.split("{username}")[1].split()[0]

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{subject}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap');
            
            body {{
                font-family: 'Poppins', Arial, sans-serif;
                margin: 0;
                padding: 0;
                color: #333333;
                background-color: #f5f5f5;
            }}
            
            .email-container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            }}
            
            .email-header {{
                background: linear-gradient(135deg, #8B5CF6 0%, #1E40AF 100%);
                color: white;
                padding: 30px 20px;
                text-align: center;
            }}
            
            .email-header h1 {{
                margin: 0;
                font-size: 28px;
                font-weight: 700;
            }}
            
            .emoji-icon {{
                font-size: 36px;
                margin: 10px 0;
            }}
            
            .welcome-text {{
                font-size: 18px;
                margin-top: 10px;
                opacity: 0.9;
            }}
            
            .email-body {{
                padding: 30px 20px;
                line-height: 1.6;
            }}
            
            .username {{
                font-weight: 700;
                color: #8B5CF6;
            }}
            
            .feature-section {{
                background-color: #f9f9f9;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }}
            
            .feature-title {{
                font-weight: 600;
                color: #1E40AF;
                margin-top: 0;
                margin-bottom: 10px;
                font-size: 18px;
            }}
            
            .feature-list {{
                margin: 15px 0;
                padding-left: 20px;
            }}
            
            .feature-list li {{
                margin-bottom: 8px;
            }}
            
            .button-container {{
                text-align: center;
                margin: 30px 0;
            }}
            
            .cta-button {{
                display: inline-block;
                background-color: #8B5CF6;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                letter-spacing: 0.3px;
            }}
            
            .cta-button:hover {{
                background-color: #7C3AED;
            }}
            
            .divider {{
                height: 1px;
                background-color: #e5e7eb;
                margin: 25px 0;
            }}
            
            .email-footer {{
                background-color: #f9f9f9;
                padding: 20px;
                text-align: center;
                color: #6b7280;
                font-size: 14px;
            }}
            
            .social-icons {{
                margin: 15px 0;
            }}
            
            .social-icons a {{
                display: inline-block;
                margin: 0 8px;
                color: #8B5CF6;
                text-decoration: none;
            }}
            
            @media only screen and (max-width: 600px) {{
                .email-header h1 {{
                    font-size: 24px;
                }}
                
                .email-body {{
                    padding: 20px 15px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="email-header">
                <div class="emoji-icon">🎮</div>
                <h1>Welcome to MemeGame!</h1>
                <p class="welcome-text">Get ready for fun, laughter, and meme madness!</p>
            </div>
            
            <div class="email-body">
                <p>Hey <span class="username">{username}</span>! 👋</p>
                
                <p>Thanks for joining MemeGame - where humor meets competition! We're excited to have you as part of our community.</p>
                
                <div class="feature-section">
                    <h3 class="feature-title">Ready to play? Here's how it works:</h3>
                    <ul class="feature-list">
                        <li>Create or join a game room with friends</li>
                        <li>Take turns being the Judge who writes funny prompts</li>
                        <li>Choose the perfect meme to match the prompt</li>
                        <li>Score points and laugh together!</li>
                    </ul>
                </div>
                
                <div class="button-container">
                    <a href="#" class="cta-button">START PLAYING NOW</a>
                </div>
                
                <p>Pro tip: The more friends you invite, the more fun it gets! Share your game room link to get the party started.</p>
                
                <div class="divider"></div>
                
                <p>Got questions? Need help? Feel free to reply to this email - we're here to help!</p>
                
                <p>Happy Meme-ing!<br>The MemeGame Team</p>
            </div>
            
            <div class="email-footer">
                <div class="social-icons">
                    <a href="#">Twitter</a> • 
                    <a href="#">Instagram</a> • 
                    <a href="#">Discord</a>
                </div>
                <p>&copy; 2025 MemeGame. All rights reserved.</p>
                <p>You received this email because you signed up for MemeGame.</p>
            </div>
        </div>
    </body>
    </html>
    """

    payload = {
        "sender": {
            "name": MAIL_FROM_NAME,
            "email": MAIL_FROM_EMAIL
        },
        "to": [
            {
                "email": to_email
            }
        ],
        "subject": subject,
        "htmlContent": html_content
    }

    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }

    try:
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers=headers
        )

        if response.status_code in (200, 201):
            return True

        logger.error(response.text)
        return False

    except Exception as e:
        logger.error(f"Error sending email: {e}")
        return False