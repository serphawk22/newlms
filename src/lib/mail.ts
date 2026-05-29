import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_EMAIL && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Generate test account automatically for local development
    const testAccount = await nodemailer.createTestAccount();
    console.log("Creating Ethereal test email account:", testAccount.user);
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
  return transporter;
}

/**
 * Low-level email sender. Errors are caught and logged so callers are never broken.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const t = await getTransporter();
  try {
    const info = await t.sendMail({
      from: process.env.SMTP_FROM || '"SERP LMS" <info.serphawk@gmail.com>',
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html,
    });

    console.log(`[mail] Email sent successfully! Message ID: ${info.messageId}`);

    // Ethereal provides a preview URL since it doesn't actually deliver to real inboxes
    if (!process.env.SMTP_EMAIL) {
      console.log(`[mail] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (error) {
    console.error("[sendEmail] Failed to send email:", error);
    // Intentionally NOT re-throwing — email failure must never break the caller
  }
}

/**
 * Sends a rich HTML live-class notification email to one or more students.
 * Subject: "New Live Class Scheduled – Please Join"
 * Wraps sendEmail() so errors are silently swallowed and class creation is unaffected.
 */
export async function sendLiveClassEmail({
  to,
  courseName,
  sessionTitle,
  scheduledAt,
  instructorName,
  joinLink,
}: {
  to: string | string[];
  courseName: string;
  sessionTitle: string;
  scheduledAt: Date;
  instructorName: string;
  joinLink: string;
}) {
  const formattedDate = scheduledAt.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = scheduledAt.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>New Live Class Scheduled - SERP LMS</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    body, table, td, a {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    table {
      border-collapse: collapse !important;
    }
    body {
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    /* Media Queries */
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        padding: 10px !important;
      }
      .header-title {
        font-size: 24px !important;
        line-height: 32px !important;
      }
      .content-body {
        padding: 24px 16px !important;
      }
      .details-card {
        padding: 16px !important;
      }
      .detail-label {
        font-size: 11px !important;
      }
      .detail-value {
        font-size: 14px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f1f5f9; -webkit-font-smoothing: antialiased;">

  <!-- Outer background wrapper -->
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; width: 100%; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        
        <!-- Email Container (Max 650px) -->
        <!--[if mso]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="650">
        <tr>
        <td align="center" valign="top" width="650">
        <![endif]-->
        <table class="email-container" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 650px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05), 0 2px 4px rgba(15, 23, 42, 0.03); border: 1px solid #e2e8f0;">
          
          <!-- Header Area with dark navy to royal blue gradient -->
          <tr>
            <td style="background: #0f172a; background: linear-gradient(135deg, #0b1329 0%, #1e3a8a 100%); padding: 40px 48px; text-align: left;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <!-- Small company label -->
                <tr>
                  <td style="color: #38bdf8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; padding-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    SERP LMS
                  </td>
                </tr>
                <!-- Main title -->
                <tr>
                  <td class="header-title" style="color: #ffffff; font-size: 32px; font-weight: 800; line-height: 40px; letter-spacing: -0.5px; padding-bottom: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    New Live Class Scheduled
                  </td>
                </tr>
                <!-- Subtitle -->
                <tr>
                  <td style="color: #94a3b8; font-size: 15px; font-weight: 400; line-height: 22px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    A new session has been added to your course
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td class="content-body" style="padding: 40px 48px; background-color: #ffffff;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                
                <!-- Hello Student Greeting -->
                <tr>
                  <td style="color: #0f172a; font-size: 16px; font-weight: 600; line-height: 24px; padding-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    Hello Student,
                  </td>
                </tr>
                
                <!-- Intro text -->
                <tr>
                  <td style="color: #334155; font-size: 15px; font-weight: 400; line-height: 24px; padding-bottom: 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    A new live class has been scheduled for your course. Please be ready to attend on time.
                  </td>
                </tr>
                
                <!-- Clean Details Card -->
                <tr>
                  <td style="padding-bottom: 36px;">
                    <table class="details-card" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px 28px;">
                      
                      <!-- Course Name Detail Row -->
                      <tr>
                        <td style="padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
                          <table width="100%" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td class="detail-label" style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                Course Name
                              </td>
                            </tr>
                            <tr>
                              <td class="detail-value" style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                ${courseName}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Live Class Title Detail Row -->
                      <tr>
                        <td style="padding: 16px 0; border-bottom: 1px solid #e2e8f0;">
                          <table width="100%" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td class="detail-label" style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                Live Class Title
                              </td>
                            </tr>
                            <tr>
                              <td class="detail-value" style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                ${sessionTitle}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Instructor Detail Row -->
                      <tr>
                        <td style="padding: 16px 0; border-bottom: 1px solid #e2e8f0;">
                          <table width="100%" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td class="detail-label" style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                Instructor Name
                              </td>
                            </tr>
                            <tr>
                              <td class="detail-value" style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                ${instructorName}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Scheduled Date Detail Row -->
                      <tr>
                        <td style="padding: 16px 0; border-bottom: 1px solid #e2e8f0;">
                          <table width="100%" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td class="detail-label" style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                Scheduled Date
                              </td>
                            </tr>
                            <tr>
                              <td class="detail-value" style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                ${formattedDate}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Scheduled Time Detail Row -->
                      <tr>
                        <td style="padding-top: 16px;">
                          <table width="100%" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td class="detail-label" style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                Scheduled Time
                              </td>
                            </tr>
                            <tr>
                              <td class="detail-value" style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                ${formattedTime}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                    </table>
                  </td>
                </tr>
                
                <!-- Sign-off / Regards -->
                <tr>
                  <td style="color: #475569; font-size: 15px; line-height: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    Regards,<br>
                    <strong style="color: #0f172a;">SERP LMS Team</strong>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Subtle Footer Divider -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 24px 48px; text-align: center;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: #94a3b8; font-size: 12px; font-weight: 400; line-height: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    This is an automated operational notification regarding your active course enrollment.<br>
                    &copy; 2026 SERP LMS. All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->

      </td>
    </tr>
  </table>

  <!-- Join Link: ${joinLink} -->
</body>
</html>
  `;

  await sendEmail({
    to,
    subject: `New Live Class Scheduled \u2013 Please Join`,
    html,
  });
}
