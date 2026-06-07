import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mail";

let isProcessing = false;

export async function queueEmail({
  userId,
  toEmail,
  subject,
  type,
  html,
}: {
  userId?: string | null;
  toEmail: string;
  subject: string;
  type: string;
  html: string;
}) {
  try {
    const notif = await prisma.emailNotification.create({
      data: {
        userId: userId || null,
        toEmail,
        subject,
        type,
        html,
        status: "PENDING",
      },
    });

    // In Vercel serverless environment, background tasks are killed immediately after the response is sent.
    // Therefore, we must await the queue processing to ensure the email is actually sent.
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      await processQueue();
    } else {
      // Run the background worker without awaiting it in local dev so it doesn't block the request.
      processQueue().catch((err) => console.error("[processQueue background error]", err));
    }

    return notif;
  } catch (error) {
    console.error("[queueEmail] Failed to create email notification in DB:", error);
  }
}

export async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (true) {
      const pendingNotif = await prisma.emailNotification.findFirst({
        where: {
          status: "PENDING",
          retryCount: { lt: 3 },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (!pendingNotif) {
        break;
      }

      // Mark as PROCESSING or update retry count
      const updatedNotif = await prisma.emailNotification.update({
        where: { id: pendingNotif.id },
        data: {
          retryCount: { increment: 1 },
        },
      });

      const success = await sendEmail({
        to: updatedNotif.toEmail,
        subject: updatedNotif.subject,
        html: updatedNotif.html || "<p>Empty notification email</p>",
      });

      if (success) {
        await prisma.emailNotification.update({
          where: { id: updatedNotif.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            errorMessage: null,
          },
        });
      } else {
        const isMaxRetries = updatedNotif.retryCount >= 3;
        await prisma.emailNotification.update({
          where: { id: updatedNotif.id },
          data: {
            status: isMaxRetries ? "FAILED" : "PENDING",
            errorMessage: "Email failed to send through SMTP transporter.",
          },
        });
      }
    }
  } catch (error) {
    console.error("[processQueue] Error during processing:", error);
  } finally {
    isProcessing = false;
  }
}
