// Clean, modern, responsive email layout builder
function buildEmailHtml(title: string, subtitle: string, bodyContent: string, isAction: boolean = false, actionUrl?: string, actionText?: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title} - SERP LMS</title>
  <style>
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
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f1f5f9; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; width: 100%; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table class="email-container" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 650px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05), 0 2px 4px rgba(15, 23, 42, 0.03); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: #0f172a; background: linear-gradient(135deg, #0b1329 0%, #1e3a8a 100%); padding: 40px 48px; text-align: left;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: #38bdf8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; padding-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    SERP LMS
                  </td>
                </tr>
                <tr>
                  <td class="header-title" style="color: #ffffff; font-size: 30px; font-weight: 800; line-height: 38px; letter-spacing: -0.5px; padding-bottom: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    ${title}
                  </td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; font-size: 15px; font-weight: 400; line-height: 22px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    ${subtitle}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="content-body" style="padding: 40px 48px; background-color: #ffffff;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: #334155; font-size: 15px; font-weight: 400; line-height: 24px; padding-bottom: 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    ${bodyContent}
                  </td>
                </tr>
                ${isAction && actionUrl ? `
                <tr>
                  <td align="center" style="padding-top: 10px; padding-bottom: 30px;">
                    <a href="${actionUrl}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 8px; display: inline-block;">
                      ${actionText || "View Details"}
                    </a>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="color: #475569; font-size: 15px; line-height: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    Regards,<br>
                    <strong style="color: #0f172a;">SERP LMS Team</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 24px 48px; text-align: center;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: #94a3b8; font-size: 12px; font-weight: 400; line-height: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    This is an automated operational notification regarding your SERP LMS account.<br>
                    &copy; 2026 SERP LMS. All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function buildDetailsCard(rows: { label: string; value: string }[]) {
  const inner = rows.map((r, i) => {
    const borderStyle = i < rows.length - 1 ? 'border-bottom: 1px solid #e2e8f0; padding: 16px 0;' : 'padding-top: 16px;';
    const firstStyle = i === 0 ? 'padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;' : borderStyle;
    return `
      <tr>
        <td style="${firstStyle}">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                ${r.label}
              </td>
            </tr>
            <tr>
              <td style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                ${r.value}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px 28px; margin-bottom: 24px;">
      ${inner}
    </table>
  `;
}

function formatList(items: string[]) {
  return `<ul style="margin: 12px 0 0 20px; padding: 0;">${items
    .map((item) => `<li style="margin-bottom: 6px;">${item}</li>`)
    .join("")}</ul>`;
}

export function getLoginEmailHtml(userName: string, role: string, loginDateTime: string, browserInfo: string) {
  const details = buildDetailsCard([
    { label: "User Name", value: userName },
    { label: "Role", value: role },
    { label: "Login Date & Time", value: loginDateTime },
    { label: "Browser/Device Info", value: browserInfo || "Unknown" },
  ]);

  return buildEmailHtml(
    "Successful Login to LMS",
    "Security Alert: A new login was detected",
    `Hello ${userName},<br/><br/>We detected a successful login to your SERP LMS account. If this was you, you can safely ignore this email. If this wasn't you, please contact support immediately.<br/><br/>${details}`
  );
}

export function getStudentLoginEmailHtml(userName: string, loginDateTime: string) {
  const details = buildDetailsCard([
    { label: "Student", value: userName },
    { label: "Login Time", value: loginDateTime },
  ]);

  return buildEmailHtml(
    "Login Successful",
    "Welcome back to Ally Tech LMS",
    `Welcome back!<br/><br/>You successfully logged into your Ally Tech LMS account.<br/><br/>${details}<br/>Have a productive learning session.`
  );
}

export function getStudentCourseEventEmailHtml({
  title,
  subtitle,
  intro,
  courseName,
  contentTitle,
  eventLabel,
}: {
  title: string;
  subtitle: string;
  intro: string;
  courseName: string;
  contentTitle?: string;
  eventLabel: string;
}) {
  const rows = [
    { label: "Course", value: courseName },
    { label: "Event", value: eventLabel },
  ];
  if (contentTitle) rows.push({ label: "Title", value: contentTitle });

  return buildEmailHtml(title, subtitle, `${intro}<br/><br/>${buildDetailsCard(rows)}`);
}

export function getStudentAchievementEmailHtml(achievementName: string, achievementType = "Achievement") {
  const details = buildDetailsCard([
    { label: achievementType, value: achievementName },
  ]);

  return buildEmailHtml(
    "New Achievement Unlocked",
    "Keep learning and reaching new milestones",
    `Congratulations!<br/><br/>You unlocked:<br/><br/>${details}<br/>Keep learning and reaching new milestones.`
  );
}

export function getStudentCertificateEmailHtml(courseName: string, certificateNumber?: string) {
  const rows = [
    { label: "Course", value: courseName },
    { label: "Status", value: "Certificate earned" },
  ];
  if (certificateNumber) rows.push({ label: "Certificate Number", value: certificateNumber });

  return buildEmailHtml(
    "Certificate Earned",
    "Your certificate is ready",
    `Congratulations!<br/><br/>You earned a certificate for completing your course.<br/><br/>${buildDetailsCard(rows)}`
  );
}

export function getStudentLiveClassReminderEmailHtml({
  courseName,
  sessionTitle,
  scheduledAt,
  reminderLabel,
  joinLink,
}: {
  courseName: string;
  sessionTitle: string;
  scheduledAt: Date;
  reminderLabel: string;
  joinLink?: string;
}) {
  const scheduledTime = scheduledAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST";
  const details = buildDetailsCard([
    { label: "Course", value: courseName },
    { label: "Live Class", value: sessionTitle },
    { label: "Starts", value: scheduledTime },
    { label: "Reminder", value: reminderLabel },
  ]);

  return buildEmailHtml(
    `Live Class Starts ${reminderLabel}`,
    "Your upcoming live class reminder",
    `Hi Student,<br/><br/>Your live class is coming up soon.<br/><br/>${details}`,
    !!joinLink,
    joinLink,
    "Join Class"
  );
}

export function getStudentInactivityEmailHtml(userName: string, inactiveDays: 1 | 3 | 7 | 14, lastLoginDate: string) {
  const toneByDay: Record<number, { subject: string; intro: string; closer: string }> = {
    1: {
      subject: "We Miss You",
      intro: `Hi ${userName},<br/><br/>You haven't visited Ally Tech LMS in the last day.`,
      closer: "Come back and continue your learning journey.",
    },
    3: {
      subject: "Your Learning Is Waiting",
      intro: `Hi ${userName},<br/><br/>It's been 3 days since your last Ally Tech LMS session.`,
      closer: "A short session today can get your momentum back.",
    },
    7: {
      subject: "Let's Get Back on Track",
      intro: `Hi ${userName},<br/><br/>A week has passed since your last visit to Ally Tech LMS.`,
      closer: "Your courses, materials, and goals are still here when you're ready.",
    },
    14: {
      subject: "A Fresh Start Is One Login Away",
      intro: `Hi ${userName},<br/><br/>It's been 14 days since your last learning session.`,
      closer: "Pick one small lesson and restart at your own pace.",
    },
  };

  const copy = toneByDay[inactiveDays];
  const details = buildDetailsCard([
    { label: "Last Active", value: lastLoginDate },
    { label: "Reminder", value: `${inactiveDays} day${inactiveDays === 1 ? "" : "s"} inactive` },
  ]);

  return buildEmailHtml(
    copy.subject,
    "Friendly reminder from Ally Tech LMS",
    `${copy.intro}<br/><br/>A lot can happen while you're away:${formatList([
      "New learning materials",
      "New assignments",
      "New announcements",
      "New achievements",
    ])}<br/>${details}<br/>${copy.closer}`
  );
}

export function getCourseCreationEmailHtml(courseName: string, instructorName: string, creationDate: string, status: string, recipientRole: string) {
  const details = buildDetailsCard([
    { label: "Course Name", value: courseName },
    { label: "Instructor Name", value: instructorName },
    { label: "Creation Date", value: creationDate },
    { label: "Course Status", value: status },
  ]);

  let greeting = "";
  if (recipientRole === "ADMIN") {
    greeting = "Hello Admin,";
  } else if (recipientRole === "STUDENT") {
    greeting = "Hello Student,";
  } else {
    greeting = `Hello ${instructorName},`;
  }

  const message = recipientRole === "INSTRUCTOR" 
    ? `Your course has been created successfully. Below are the details:` 
    : `A new course has been created on the platform. Below are the details:`;

  return buildEmailHtml(
    "New Course Created",
    "A new learning program is available",
    `${greeting}<br/><br/>${message}<br/><br/>${details}`
  );
}

export function getAssignmentEmailHtml(assignmentTitle: string, courseName: string, dueDate: string, instructorName: string) {
  const details = buildDetailsCard([
    { label: "Assignment Title", value: assignmentTitle },
    { label: "Course", value: courseName },
    { label: "Due Date", value: dueDate },
    { label: "Instructor", value: instructorName },
  ]);

  return buildEmailHtml(
    "New Assignment Created",
    "A new task has been assigned to your course",
    `Hello Student,<br/><br/>A new assignment has been published. Please review the details and submit before the due date.<br/><br/>${details}`
  );
}

export function getQuizEmailHtml(quizTitle: string, courseName: string, questionsCount: number, instructorName: string) {
  const details = buildDetailsCard([
    { label: "Quiz Title", value: quizTitle },
    { label: "Course", value: courseName },
    { label: "Total Questions", value: `${questionsCount}` },
    { label: "Instructor", value: instructorName },
  ]);

  return buildEmailHtml(
    "New Quiz Created",
    "A new assessment is active",
    `Hello Student,<br/><br/>A new quiz has been published. Make sure to complete the assessment before the deadline.<br/><br/>${details}`
  );
}

export function getFeedbackEmailHtml(assessmentTitle: string, score: number, maxScore: number, feedback: string, graderName: string) {
  const details = buildDetailsCard([
    { label: "Assessment", value: assessmentTitle },
    { label: "Your Score", value: `${score} / ${maxScore}` },
    { label: "Feedback", value: feedback || "No written feedback provided." },
    { label: "Graded By", value: graderName },
  ]);

  return buildEmailHtml(
    "Feedback & Grades Published",
    "Your submission has been reviewed",
    `Hello Student,<br/><br/>Your instructor has graded your submission. Below is the breakdown of your performance:<br/><br/>${details}`
  );
}

export function getCourseUpdateEmailHtml(courseName: string, updateType: string, contentTitle: string) {
  const details = buildDetailsCard([
    { label: "Course", value: courseName },
    { label: "Update Type", value: updateType },
    { label: "Content Title", value: contentTitle },
  ]);

  return buildEmailHtml(
    "Course Content Updated",
    "New resources are available for your study",
    `Hello Student,<br/><br/>New content has been added or updated in your course. Feel free to log in and review the materials.<br/><br/>${details}`
  );
}

export function getInactivityEmailHtml(userName: string, lastLoginDate: string) {
  const details = buildDetailsCard([
    { label: "User Name", value: userName },
    { label: "Last Active", value: lastLoginDate },
  ]);

  return buildEmailHtml(
    "We Miss You at SERP LMS!",
    "It's been a while since your last visit",
    `Hello ${userName},<br/><br/>We noticed you haven't logged in to SERP LMS in the last 24 hours. Consistent practice is key to mastering new skills! Head back to the platform and continue your learning journey.<br/><br/>${details}`
  );
}
