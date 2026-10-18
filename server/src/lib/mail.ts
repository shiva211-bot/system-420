import { config } from "../config";

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  console.log(`[mail] to=${to} subject=${subject}\n${text}`);
  if (!config.smtpHost) return;
}

export function verifyEmailBody(username: string, url: string): { subject: string; text: string } {
  return {
    subject: "Verify your Gaiya System account",
    text: [
      `Operator ${username},`,
      "",
      `Your assigned handle is ${username}. Sign in with your email after verification.`,
      "Confirm this email to finish creating your Gaiya System account.",
      "This single-use link expires in 24 hours:",
      url,
      "",
      "If you did not register, ignore this message.",
      "Gaiya System does not send marketing mail. This is a transactional notice only.",
    ].join("\n"),
  };
}

export function resetEmailBody(url: string): { subject: string; text: string } {
  return {
    subject: "Reset your Gaiya System password",
    text: [
      "A password reset was requested for this email on Gaiya System.",
      "This single-use link expires in 1 hour:",
      url,
      "",
      "If you did not request a reset, ignore this message. Your password will not change.",
      "Gaiya System does not send marketing mail. This is a transactional notice only.",
    ].join("\n"),
  };
}

export function existingAccountEmailBody(): { subject: string; text: string } {
  return {
    subject: "Gaiya System account notice",
    text: [
      "Someone tried to register this email on Gaiya System.",
      "An account already exists. If this was you, sign in or use the password reset page.",
      "If this was not you, you can ignore this message.",
    ].join("\n"),
  };
}
