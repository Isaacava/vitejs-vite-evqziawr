import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP_HOST, SMTP_USER and SMTP_PASS are required");
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

export async function sendDeliverableEmail(args: { to: string; subject: string; filename: string; content: string; jobId: string }) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  await getTransport().sendMail({
    from,
    to: args.to,
    subject: args.subject,
    text: `Your AgentMarket deliverable for ERC-8183 job ${args.jobId} is attached.`,
    attachments: [{ filename: args.filename, content: args.content, contentType: "text/plain; charset=utf-8" }],
  });
}
