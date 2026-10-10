import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let transporter;

function getTransporter() {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  if (!to) return;
  const smtp = getTransporter();
  if (!smtp) {
    if (env.NODE_ENV !== 'production') {
      logger.warn({ to, subject, text, html }, 'SMTP_HOST não configurado (modo de desenvolvimento). Email simulado em log.');
      return;
    }
    logger.error({ subject }, 'Email não enviado; configura o SMTP para ativar verificação e recuperação de conta.');
    throw new Error('SMTP_HOST é necessário para enviar emails de conta.');
  }
  await smtp.sendMail({ from: env.SMTP_FROM, to, subject, html, text });
}

export async function sendVerificationEmail(user, token) {
  const link = `${env.PUBLIC_BASE_URL}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: user.email,
    subject: 'Verifica a tua conta Light Group',
    text: `Abre este link para verificar a conta: ${link}`,
    html: `<p>Bem-vindo/a ao Light Group.</p><p><a href="${link}">Verificar conta</a></p>`
  });
}

export async function sendPasswordResetEmail(user, token) {
  const link = `${env.PUBLIC_BASE_URL}/demo/reset-password.html?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: user.email,
    subject: 'Repor palavra-passe Light Group',
    text: `Abre este link para repor a palavra-passe: ${link}`,
    html: `<p>Recebemos um pedido para repor a tua palavra-passe.</p><p><a href="${link}">Repor palavra-passe</a></p>`
  });
}

export async function sendSecurityEmail(user, subject, message) {
  await sendMail({
    to: user.email,
    subject,
    text: message,
    html: `<p>${message}</p>`
  });
}
