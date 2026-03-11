from datetime import datetime
import os
import requests
import logging

logger = logging.getLogger(__name__)

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
MAIL_FROM_EMAIL = os.getenv("MAIL_FROM_EMAIL")
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "MemeGame")


def get_thank_you_email(name, message):
    display_name = name or "there"
    current_year = datetime.now().year
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {{ margin: 0; padding: 0; background-color: #f4f4f5; }}
        @media only screen and (max-width: 480px) {{
          .container {{ width: 100% !important; }}
        }}
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5; padding: 50px 15px;">
      <center>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 460px;">
          <tr>
            <td>
              
              <table class="container" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #131010;">
                <tr>
                  <td style="padding-bottom: 8px; padding-right: 8px;">
                    
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 3px solid #131010;">
                      
                      <tr>
                        <td style="padding: 40px 35px 20px 35px;">
                          <h1 style="margin: 0; color: #131010; font-family: 'Trebuchet MS', Arial, sans-serif; font-size: 26px; font-weight: 900; letter-spacing: -1px;">
                            Subhash Yaganti
                          </h1>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 0 35px 35px 35px; font-family: Arial, sans-serif;">
                          <p style="margin: 0 0 25px 0; color: #131010; font-size: 16px; line-height: 1.6; font-weight: 500;">
                            Hi {display_name},<br><br>
                            Thank you for reaching out! I've received your message and will review it as soon as I can. Here is a copy of what you sent:
                          </p>

                          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border: 2px solid #131010; margin-bottom: 30px;">
                            <tr>
                              <td style="padding: 20px;">
                                <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.6; font-style: italic;">
                                  "{message}"
                                </p>
                              </td>
                            </tr>
                          </table>

                          <div style="margin-bottom: 30px;">
                            <p style="margin: 0; color: #131010; font-size: 15px; font-weight: bold;">Best regards,</p>
                            <p style="margin: 4px 0 0 0; color: #131010; font-size: 16px; font-weight: 900;">Subhash Yaganti</p>
                            <p style="margin: 2px 0 0 0; color: #666666; font-size: 13px; font-weight: 600;">Full-Stack Developer</p>
                          </div>

                          <table border="0" cellpadding="0" cellspacing="0" style="margin-top: 10px;">
                            <tr>
                              <td align="center" style="padding-right: 15px;">
                                <a href="https://github.com/subhash-22-codes" target="_blank">
                                  <img src="https://img.icons8.com/ios-filled/24/131010/github.png" alt="GitHub" width="24" height="24" style="display: block; border: none;">
                                </a>
                              </td>
                              <td align="center" style="padding-right: 15px;">
                                <a href="https://www.linkedin.com/in/subhash-yaganti-a8b3b626a/" target="_blank">
                                  <img src="https://img.icons8.com/ios-filled/24/131010/linkedin.png" alt="LinkedIn" width="24" height="24" style="display: block; border: none;">
                                </a>
                              </td>
                              <td align="center">
                                <a href="https://x.com/SYaganti44806" target="_blank">
                                  <img src="https://img.icons8.com/ios-filled/24/131010/twitterx.png" alt="X (Twitter)" width="24" height="24" style="display: block; border: none;">
                                </a>
                              </td>
                            </tr>
                          </table>

                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 25px 35px; background-color: #ffffff; border-top: 2px dashed #131010; text-align: center;">
                          <div style="margin-bottom: 10px; color: #666666; font-size: 12px; font-weight: 600;">
                            Hyderabad, Telangana, India
                          </div>
                          <div style="color: #999999; font-size: 11px; font-weight: 600;">
                            &copy; {current_year} Subhash Yaganti
                          </div>
                        </td>
                      </tr>

                    </table></td>
                </tr>
              </table></td>
          </tr>
        </table>
      </center>
    </body>
    </html>
    """
    
def send_contact_thankyou_email(to_email, subject, html_content):
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
        logger.error(f"Contact email error: {e}")
        return False
    
    
def get_professional_otp_template(otp, user_name=None, company_name="MemeGame"):
    """Generate beautiful, responsive HTML email template for Password Reset OTP"""
    display_name = user_name or "player"
    logo_url = "https://res.cloudinary.com/dggciuh9l/image/upload/v1772964062/profile_pics/mj33bzlosk0uux1nc3js.png"
    
    html_template = f"""<!DOCTYPE html>
    <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <title>Password Reset</title>
        
        <style>
            /* CSS Reset */
            body, p, h1, h2, h3, h4, h5, h6 {{ margin: 0; padding: 0; }}
            body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
            table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
            img {{ border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }}
            table {{ border-collapse: collapse !important; }}
            
            /* Base Light Mode Styles */
            body {{ background-color: #FFDDAB !important; }}
            .bg-body {{ background-color: #FFDDAB !important; }}
            .bg-white {{ background-color: #ffffff !important; }}
            .text-black {{ color: #131010 !important; }}
            .border-black {{ border: 3px solid #131010 !important; }}
            
            .otp-code {{ 
                -webkit-user-select: all; 
                -moz-user-select: all; 
                -ms-user-select: all; 
                user-select: all; 
                word-break: break-all;
            }}

            /* Responsive Rules */
            @media screen and (max-width: 480px) {{
                .fluid-container {{ width: 92% !important; max-width: 92% !important; }}
                .content-padding {{ padding: 30px 20px !important; }}
                .otp-container {{ padding: 20px 15px !important; }}
                h1 {{ font-size: 24px !important; }}
                .otp-code {{ font-size: 34px !important; letter-spacing: 5px !important; }}
            }}

            /* Strict Dark Mode Overrides */
            @media (prefers-color-scheme: dark) {{
                body, .bg-body {{ background-color: #1a1a1a !important; }}
                
                .bg-white {{ background-color: #2d2d2d !important; }}
                .text-black {{ color: #ffffff !important; }}
                
                /* Notice Box */
                .notice-box {{ background-color: #3d3d3d !important; border: 2px solid #ffffff !important; }}
                
                /* OTP Box - Keep yellow, force text/borders black */
                .dark-otp-box {{ background-color: #FFCC00 !important; border: 3px solid #ffffff !important; }}
                .dark-otp-text {{ color: #131010 !important; }}
                
                /* Borders and Shadows */
                .border-black {{ border: 3px solid #ffffff !important; }}
                .brutalist-shadow {{ 
                    border-bottom: 6px solid #ffffff !important; 
                    border-right: 6px solid #ffffff !important; 
                }}
                .footer-border {{ border-top: 2px dashed #ffffff !important; }}
                
                .text-dim {{ color: #cccccc !important; opacity: 0.9 !important; }}
            }}
        </style>
    </head>
    <body class="bg-body" style="margin: 0; padding: 0; background-color: #FFDDAB; min-width: 100%; -webkit-font-smoothing: antialiased;">

        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" class="bg-body" style="background-color: #FFDDAB; table-layout: fixed;">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    
                    <table class="fluid-container bg-white border-black brutalist-shadow" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto; width: 92%; max-width: 420px; background-color: #ffffff; border: 3px solid #131010; border-bottom: 6px solid #131010; border-right: 6px solid #131010;">
                        
                        <tr>
                            <td class="content-padding" style="padding: 35px 35px 20px 35px; text-align: left; font-family: 'Trebuchet MS', Arial, sans-serif;">
                                
                                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 20px;">
                                    <tr>
                                        <td valign="middle" style="padding-right: 10px;">
                                            <img src="{logo_url}" width="32" height="32" alt="Logo" style="display: block; border: 0;">
                                        </td>
                                        <td valign="middle">
                                            <span class="text-black" style="color: #131010; font-family: 'Arial Black', Impact, sans-serif; font-size: 18px; font-weight: 900; letter-spacing: -0.5px; text-transform: lowercase;">
                                                {company_name}
                                            </span>
                                        </td>
                                    </tr>
                                </table>

                                <h1 class="text-black" style="margin: 0; color: #131010; font-family: 'Trebuchet MS', Arial, sans-serif; font-size: 24px; font-weight: 900; letter-spacing: -1px; text-transform: lowercase;">
                                    password reset.
                                </h1>
                            </td>
                        </tr>

                        <tr>
                            <td class="content-padding" style="padding: 0 35px 35px 35px; font-family: Arial, sans-serif; text-align: left;">
                                <p class="text-black text-dim" style="margin: 0 0 25px 0; color: #131010; font-size: 15px; line-height: 1.6; font-weight: 600; opacity: 0.8;">
                                    hi {display_name}, <br><br>
                                    here is the code to reset your password. tap it to copy.
                                </p>

                                <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" class="dark-otp-box border-black" style="background-color: #FFCC00; border: 3px solid #131010; margin-bottom: 25px;">
                                    <tr>
                                        <td class="otp-container" style="padding: 30px 20px; text-align: center;">
                                            <p class="dark-otp-text" style="margin: 0 0 15px 0; color: #131010; font-size: 13px; font-weight: 900; text-transform: lowercase; letter-spacing: 1px;">
                                                your reset code:
                                            </p>
                                            
                                            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #131010; margin: 0 auto; width: 100%; max-width: 250px;">
                                                <tr>
                                                    <td align="center" style="padding: 15px 10px;">
                                                        <span class="otp-code" style="color: #FFDDAB; font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 6px; display: block;">
                                                            {otp}
                                                        </span>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" class="notice-box" style="background-color: #f4f4f4; border: 2px solid #131010;">
                                    <tr>
                                        <td style="padding: 20px;">
                                            <p class="text-black" style="margin: 0 0 5px 0; color: #131010; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">
                                                security notice
                                            </p>
                                            <p class="text-black text-dim" style="margin: 0; color: #131010; font-size: 12px; font-weight: 600; line-height: 1.5; opacity: 0.6;">
                                                this code expires in 5 minutes. if you didn't ask for this, just ignore this email. your account is safe.
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                            </td>
                        </tr>

                       <tr>
                          <td style="padding:32px; background:#fdfdfd; border-top:2px dashed #131010; text-align:center; font-family:'Trebuchet MS', Arial, sans-serif;">

                          <!-- Logo -->
                          <div style="margin-bottom:14px;">
                          <img src="{logo_url}" width="28" height="28" alt="MemeGame" style="display:inline-block; opacity:0.55; filter:grayscale(100%);">
                          </div>

                          <!-- Brand -->
                          <div style="margin-bottom:6px; color:#131010; font-size:14px; font-weight:900; letter-spacing:0.8px; text-transform:lowercase;">
                          memegame
                          </div>

                          <!-- Tagline -->
                          <div style="margin-bottom:16px; color:#131010; font-size:11px; font-weight:700; opacity:0.55; text-transform:lowercase;">
                          the multiplayer meme party game
                          </div>

                          <!-- Links -->
                          <div style="margin-bottom:16px; font-size:11px; font-weight:700; opacity:0.55; text-transform:lowercase;">
                          <a href="https://meme-game-six.vercel.app" style="color:#131010; text-decoration:none;">play</a>
                          &nbsp;&nbsp;•&nbsp;&nbsp;
                          <a href="mailto:memegame499@gmail.com" style="color:#131010; text-decoration:none;">support</a>
                          &nbsp;&nbsp;•&nbsp;&nbsp;
                          <a href="https://meme-game-six.vercel.app" style="color:#131010; text-decoration:none;">website</a>
                          </div>

                          <!-- Location -->
                          <div style="margin-bottom:10px; color:#131010; font-size:11px; font-weight:700; opacity:0.45; text-transform:lowercase;">
                          hyderabad, telangana, india
                          </div>

                          <!-- Copyright -->
                          <div style="color:#131010; font-size:10px; font-weight:900; opacity:0.35;">
                          © 2026 memegame. all rights reserved.
                          </div>

                          </td>
                          </tr>

                    </table>

                    </td>
            </tr>
        </table>
    </body>
    </html>"""
    
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
    display_name = user_name or "there"
    logo_url = "https://res.cloudinary.com/dggciuh9l/image/upload/v1772964062/profile_pics/mj33bzlosk0uux1nc3js.png"
    
    return f"""<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>Welcome to {company_name}</title>
    
    <style>
        /* CSS Reset */
        body, p, h1, h2, h3, h4, h5, h6 {{ margin: 0; padding: 0; }}
        body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
        table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
        img {{ border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }}
        table {{ border-collapse: collapse !important; }}
        
        /* Base Light Mode Styles */
        body {{ background-color: #FFDDAB !important; }}
        .bg-body {{ background-color: #FFDDAB !important; }}
        .bg-white {{ background-color: #ffffff !important; }}
        .text-black {{ color: #131010 !important; }}
        .border-black {{ border: 3px solid #131010 !important; }}
        
        .otp-code {{ 
            -webkit-user-select: all; 
            -moz-user-select: all; 
            -ms-user-select: all; 
            user-select: all; 
            word-break: break-all;
        }}

        /* Responsive Rules */
        @media screen and (max-width: 480px) {{
            .fluid-container {{ width: 92% !important; max-width: 92% !important; }}
            .content-padding {{ padding: 30px 20px !important; }}
            .otp-container {{ padding: 20px 15px !important; }}
            h1 {{ font-size: 24px !important; }}
            .otp-code {{ font-size: 34px !important; letter-spacing: 5px !important; }}
        }}

        /* Strict Dark Mode Overrides */
        @media (prefers-color-scheme: dark) {{
            body, .bg-body {{ background-color: #1a1a1a !important; }}
            
            /* In dark mode, the main card goes dark grey, text goes white */
            .bg-white {{ background-color: #2d2d2d !important; }}
            .text-black {{ color: #ffffff !important; }}
            
            /* Keep the OTP box yellow so it pops, but force the text inside to be dark */
            .dark-otp-box {{ background-color: #FFCC00 !important; }}
            .dark-otp-text {{ color: #131010 !important; }}
            
            /* Keep borders white or light grey for contrast against dark background */
            .border-black {{ border: 3px solid #ffffff !important; }}
            .brutalist-shadow {{ 
                border-bottom: 6px solid #ffffff !important; 
                border-right: 6px solid #ffffff !important; 
            }}
            .footer-border {{ border-top: 2px dashed #ffffff !important; }}
            
            /* Dimmer text for secondary info */
            .text-dim {{ color: #cccccc !important; opacity: 0.8 !important; }}
        }}
    </style>
</head>
<body class="bg-body" style="margin: 0; padding: 0; background-color: #FFDDAB; min-width: 100%; -webkit-font-smoothing: antialiased;">

    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" class="bg-body" style="background-color: #FFDDAB; table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                
                <table class="fluid-container bg-white border-black brutalist-shadow" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto; width: 92%; max-width: 380px; background-color: #ffffff; border: 3px solid #131010; border-bottom: 6px solid #131010; border-right: 6px solid #131010;">
                    
                    <tr>
                        <td class="content-padding" style="padding: 45px 30px; text-align: center; font-family: 'Trebuchet MS', Arial, sans-serif;">
                            
                            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto 25px auto;">
                                <tr>
                                    <td valign="middle" style="padding-right: 10px;">
                                        <img src="{logo_url}" width="32" height="32" alt="{company_name} Logo" style="display: block; border: 0;">
                                    </td>
                                    <td valign="middle">
                                        <span class="text-black" style="color: #131010; font-family: 'Arial Black', Impact, sans-serif; font-size: 18px; font-weight: 900; letter-spacing: -0.5px; text-transform: lowercase;">
                                            {company_name}
                                        </span>
                                    </td>
                                </tr>
                            </table>

                            <h1 class="text-black" style="margin: 0 0 10px 0; color: #131010; font-size: 26px; font-weight: 900; letter-spacing: -1px; text-transform: lowercase;">
                                hi {display_name}, welcome.
                            </h1>
                            <p class="text-black text-dim" style="margin: 0 0 40px 0; color: #131010; font-size: 15px; font-weight: 600; opacity: 0.6;">
                                let's get you registered for memegame.
                            </p>

                            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" class="border-black dark-otp-box" style="background-color: #FFCC00; border: 3px solid #131010;">
                                <tr>
                                    <td class="otp-container" style="padding: 30px 15px;">
                                        <p class="dark-otp-text" style="margin: 0 0 15px 0; color: #131010; font-size: 13px; font-weight: 900; text-transform: lowercase; letter-spacing: 1.5px;">
                                            tap the code to select:
                                        </p>
                                        
                                        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #131010; margin: 0 auto; width: 100%; max-width: 250px;">
                                            <tr>
                                                <td align="center" style="padding: 15px 10px;">
                                                    <span class="otp-code" style="color: #FFDDAB; font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 6px; display: block;">
                                                        {otp}
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <p class="text-black text-dim" style="margin: 35px 0 0 0; color: #131010; font-size: 12px; font-weight: 700; line-height: 1.6; opacity: 0.4;">
                                this code is only good for 5 minutes. <br/>
                                if you didn't ask for this, just ignore it.
                            </p>

                        </td>
                    </tr>

                    <tr>
                      <td style="padding:32px; background:#fdfdfd; border-top:2px dashed #131010; text-align:center; font-family:'Trebuchet MS', Arial, sans-serif;">

                      <!-- Logo -->
                      <div style="margin-bottom:14px;">
                      <img src="{logo_url}" width="28" height="28" alt="MemeGame" style="display:inline-block; opacity:0.55; filter:grayscale(100%);">
                      </div>

                      <!-- Brand -->
                      <div style="margin-bottom:6px; color:#131010; font-size:14px; font-weight:900; letter-spacing:0.8px; text-transform:lowercase;">
                      memegame
                      </div>

                      <!-- Tagline -->
                      <div style="margin-bottom:16px; color:#131010; font-size:11px; font-weight:700; opacity:0.55; text-transform:lowercase;">
                      the multiplayer meme party game
                      </div>

                      <!-- Links -->
                      <div style="margin-bottom:16px; font-size:11px; font-weight:700; opacity:0.55; text-transform:lowercase;">
                      <a href="https://meme-game-six.vercel.app" style="color:#131010; text-decoration:none;">play</a>
                      &nbsp;&nbsp;•&nbsp;&nbsp;
                      <a href="mailto:memegame499@gmail.com" style="color:#131010; text-decoration:none;">support</a>
                      &nbsp;&nbsp;•&nbsp;&nbsp;
                      <a href="https://meme-game-six.vercel.app" style="color:#131010; text-decoration:none;">website</a>
                      </div>

                      <!-- Location -->
                      <div style="margin-bottom:10px; color:#131010; font-size:11px; font-weight:700; opacity:0.45; text-transform:lowercase;">
                      hyderabad, telangana, india
                      </div>

                      <!-- Copyright -->
                      <div style="color:#131010; font-size:10px; font-weight:900; opacity:0.35;">
                      © 2026 memegame. all rights reserved.
                      </div>

                      </td>
                      </tr>

                </table>

                </td>
        </tr>
    </table>
</body>
</html>"""

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
        now_str = datetime.now().strftime("%I:%M %p")

        # User POV Subject: Simple and high-energy
        subject = f"Your MemeGame Code is here! 🎮 ({now_str})"

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
    # Extract username safely based on your backend payload
    username = to_email.split('@')[0]
    if "Welcome " in body and " to MemeGame" in body:
        username = body.split("Welcome ")[1].split(" to MemeGame")[0]
    elif "{username}" in body:
        username = body.split("{username}")[1].split()[0]
        
    display_name = username or "player"
    logo_url = "https://res.cloudinary.com/dggciuh9l/image/upload/v1772964062/profile_pics/mj33bzlosk0uux1nc3js.png"

    html_content = f"""<!DOCTYPE html>
    <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <title>Welcome to the Squad</title>
        
        <style>
            /* CSS Reset */
            body, p, h1, h2, h3, h4, h5, h6 {{ margin: 0; padding: 0; }}
            body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
            table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
            img {{ border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }}
            table {{ border-collapse: collapse !important; }}
            
            /* Base Light Mode Styles */
            body {{ background-color: #FFDDAB !important; }}
            .bg-body {{ background-color: #FFDDAB !important; }}
            .bg-white {{ background-color: #ffffff !important; }}
            .text-black {{ color: #131010 !important; }}
            .border-black {{ border: 3px solid #131010 !important; }}
            .border-thin-black {{ border: 2px solid #131010 !important; }}

            /* Responsive Rules */
            @media screen and (max-width: 480px) {{
                .fluid-container {{ width: 92% !important; max-width: 92% !important; }}
                .content-padding {{ padding: 30px 20px !important; }}
                .rules-padding {{ padding: 20px 15px !important; }}
                .hero-text {{ font-size: 24px !important; }}
            }}

            /* Strict Dark Mode Overrides */
            @media (prefers-color-scheme: dark) {{
                body, .bg-body {{ background-color: #1a1a1a !important; }}
                
                /* Main card inversion */
                .bg-white {{ background-color: #2d2d2d !important; }}
                .text-black {{ color: #ffffff !important; }}
                
                /* Inner Grey Box */
                .rules-box {{ background-color: #3d3d3d !important; border: 2px solid #ffffff !important; }}
                
                /* CTA Box - Keep yellow, force text/borders black for contrast */
                .cta-box {{ background-color: #FFCC00 !important; border: 3px solid #ffffff !important; }}
                .cta-text {{ color: #131010 !important; }}
                .cta-button-shadow {{ background-color: #131010 !important; }}
                
                /* Borders and Shadows */
                .border-black {{ border: 3px solid #ffffff !important; }}
                .brutalist-shadow {{ 
                    border-bottom: 6px solid #ffffff !important; 
                    border-right: 6px solid #ffffff !important; 
                }}
                .footer-border {{ border-top: 2px dashed #ffffff !important; }}
                
                /* Dimmer text for secondary info */
                .text-dim {{ color: #cccccc !important; opacity: 0.9 !important; }}
            }}
        </style>
    </head>
    <body class="bg-body" style="margin: 0; padding: 0; background-color: #FFDDAB; min-width: 100%; -webkit-font-smoothing: antialiased;">

        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" class="bg-body" style="background-color: #FFDDAB; table-layout: fixed;">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    
                    <table class="fluid-container bg-white border-black brutalist-shadow" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto; width: 92%; max-width: 460px; background-color: #ffffff; border: 3px solid #131010; border-bottom: 6px solid #131010; border-right: 6px solid #131010;">
                        
                        <tr>
                            <td class="content-padding" style="padding: 35px 35px 20px 35px; text-align: left; font-family: 'Trebuchet MS', Arial, sans-serif;">
                                
                                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 30px;">
                                    <tr>
                                        <td valign="middle" style="padding-right: 12px;">
                                            <img src="{logo_url}" width="36" height="36" alt="MemeGame Logo" style="display: block; border: 2px solid #131010; background-color: #FFCC00; padding: 4px;">
                                        </td>
                                        <td valign="middle">
                                            <span class="text-black" style="color: #131010; font-family: 'Arial Black', Impact, sans-serif; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; text-transform: lowercase;">
                                                MemeGame
                                            </span>
                                        </td>
                                    </tr>
                                </table>

                                <h1 class="hero-text text-black" style="margin: 0; color: #131010; font-size: 28px; font-weight: 900; letter-spacing: -1px; text-transform: lowercase;">
                                    hi {display_name}, <br/> welcome to the squad.
                                </h1>
                            </td>
                        </tr>

                        <tr>
                            <td class="content-padding" style="padding: 0 35px 35px 35px; font-family: Arial, sans-serif; text-align: left;">
                                <p class="text-black text-dim" style="margin: 0 0 25px 0; color: #131010; font-size: 15px; line-height: 1.6; font-weight: 600; opacity: 0.8;">
                                    you're officially in. let's get you ready for the funniest game on the internet. here is how we play:
                                </p>

                               <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" class="rules-box" style="background-color: #f4f4f4; border: 2px solid #131010; margin-bottom: 30px;">
                                <tr>
                                    <td class="rules-padding" style="padding: 20px 25px;">
                                        
                                        <p class="text-black" style="margin: 0 0 14px 0; color: #131010; font-size: 14px; font-weight: 900; text-transform: lowercase;">
                                            how a round works
                                        </p>

                                        <p class="text-black" style="margin: 0 0 10px 0; color: #131010; font-size: 14px; font-weight: 800; text-transform: lowercase;">
                                            1. create a room and drop the code to your squad.
                                        </p>

                                        <p class="text-black" style="margin: 0 0 10px 0; color: #131010; font-size: 14px; font-weight: 800; text-transform: lowercase;">
                                            2. one player becomes the judge and writes a wild sentence.
                                        </p>

                                        <p class="text-black" style="margin: 0 0 10px 0; color: #131010; font-size: 14px; font-weight: 800; text-transform: lowercase;">
                                            3. everyone else picks the meme that matches the sentence best.
                                        </p>

                                        <p class="text-black" style="margin: 0 0 10px 0; color: #131010; font-size: 14px; font-weight: 800; text-transform: lowercase;">
                                            4. memes are revealed and the judge scores the funniest ones.
                                        </p>

                                        <p class="text-black" style="margin: 0; color: #131010; font-size: 14px; font-weight: 800; text-transform: lowercase;">
                                            5. stack points, climb the leaderboard, and take the crown.
                                        </p>

                                    </td>
                                </tr>
                            </table>

                                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" class="cta-box" style="background-color: #FFCC00; border: 3px solid #131010; margin-bottom: 10px;">
                                    <tr>
                                        <td style="padding: 30px 20px; text-align: center;">
                                            <p class="cta-text" style="margin: 0 0 18px 0; color: #131010; font-size: 15px; font-weight: 900; text-transform: lowercase; letter-spacing: 0.5px;">
                                                ready to ruin your friendships?
                                            </p>
                                            
                                            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" class="cta-button-shadow" style="background-color: #131010;">
                                                <tr>
                                                    <td style="padding-bottom: 4px; padding-right: 4px;">
                                                        <a href="https://meme-game-six.vercel.app" style="display: inline-block; background-color: #5F8B4C; color: #ffffff; border: 2px solid #131010; padding: 14px 28px; text-decoration: none; font-size: 14px; font-weight: 900; text-transform: lowercase; letter-spacing: 1px;">
                                                            start playing now
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                       <tr>
                        <td style="padding:32px; background:#fdfdfd; border-top:2px dashed #131010; text-align:center; font-family:'Trebuchet MS', Arial, sans-serif;">

                        <!-- Logo -->
                        <div style="margin-bottom:14px;">
                        <img src="{logo_url}" width="28" height="28" alt="MemeGame" style="display:inline-block; opacity:0.55; filter:grayscale(100%);">
                        </div>

                        <!-- Brand -->
                        <div style="margin-bottom:6px; color:#131010; font-size:14px; font-weight:900; letter-spacing:0.8px; text-transform:lowercase;">
                        memegame
                        </div>

                        <!-- Tagline -->
                        <div style="margin-bottom:16px; color:#131010; font-size:11px; font-weight:700; opacity:0.55; text-transform:lowercase;">
                        the multiplayer meme party game
                        </div>

                        <!-- Links -->
                        <div style="margin-bottom:16px; font-size:11px; font-weight:700; opacity:0.55; text-transform:lowercase;">
                        <a href="https://meme-game-six.vercel.app" style="color:#131010; text-decoration:none;">play</a>
                        &nbsp;&nbsp;•&nbsp;&nbsp;
                        <a href="mailto:memegame499@gmail.com" style="color:#131010; text-decoration:none;">support</a>
                        &nbsp;&nbsp;•&nbsp;&nbsp;
                        <a href="https://meme-game-six.vercel.app" style="color:#131010; text-decoration:none;">website</a>
                        </div>

                        <!-- Location -->
                        <div style="margin-bottom:10px; color:#131010; font-size:11px; font-weight:700; opacity:0.45; text-transform:lowercase;">
                        hyderabad, telangana, india
                        </div>

                        <!-- Copyright -->
                        <div style="color:#131010; font-size:10px; font-weight:900; opacity:0.35;">
                        © 2026 memegame. all rights reserved.
                        </div>

                        </td>
                        </tr>

                    </table>

                    </td>
            </tr>
        </table>
    </body>
    </html>"""

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