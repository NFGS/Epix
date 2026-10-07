#!/usr/bin/env node
/**
 * Configura el SMTP propio de Supabase para Epix (habilita códigos OTP reales,
 * plantillas con `{{ .Token }}` y el límite de envíos).
 *
 * Proveedores soportados (variables en ~/.config/secrets.env; nunca se imprimen):
 *
 *  A) Resend (por defecto si hay RESEND_API_KEY):
 *       RESEND_API_KEY=re_...
 *
 *  B) Cualquier SMTP (Gmail, Brevo, …):
 *       SMTP_HOST=smtp.gmail.com
 *       SMTP_PORT=465
 *       SMTP_USER=tucorreo@gmail.com
 *       SMTP_PASS=contrasena-de-aplicacion
 *
 *  Comunes:
 *   SUPABASE_ACCESS_TOKEN   token personal de Supabase
 *   SMTP_ADMIN_EMAIL        remitente visible (p. ej. tucorreo@gmail.com)
 *   SMTP_SENDER_NAME        opcional (por defecto «Epix»)
 *   SUPABASE_PROJECT_REF    opcional (por defecto el proyecto epix-db)
 *
 * Uso:
 *   set -a; . ~/.config/secrets.env; set +a; node scripts/setup-smtp.mjs
 */
const ref = process.env.SUPABASE_PROJECT_REF ?? 'qeadwdtzqgbdbrczhkuf';
const token = process.env.SUPABASE_ACCESS_TOKEN;
const resendKey = process.env.RESEND_API_KEY;
const adminEmail = process.env.SMTP_ADMIN_EMAIL;
const senderName = process.env.SMTP_SENDER_NAME ?? 'Epix';

const host = process.env.SMTP_HOST ?? (resendKey ? 'smtp.resend.com' : null);
const port = process.env.SMTP_PORT ?? (resendKey ? '465' : null);
const user = process.env.SMTP_USER ?? (resendKey ? 'resend' : null);
const pass = process.env.SMTP_PASS ?? resendKey;

const missing = [
  ['SUPABASE_ACCESS_TOKEN', token],
  ['SMTP_ADMIN_EMAIL', adminEmail],
  ['SMTP_HOST o RESEND_API_KEY', host],
  ['SMTP_PORT (si usas SMTP_HOST)', process.env.SMTP_HOST ? port : 'n/a'],
  ['SMTP_USER (si usas SMTP_HOST)', process.env.SMTP_HOST ? user : 'n/a'],
  ['SMTP_PASS o RESEND_API_KEY', pass],
].filter(([, value]) => !value || value === '');

if (missing.length > 0) {
  console.error('Faltan variables de entorno:', missing.map(([name]) => name).join(', '));
  console.error('Añádelas a ~/.config/secrets.env (no se imprimen) y reintenta.');
  process.exit(1);
}

const base = `https://api.supabase.com/v1/projects/${ref}`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const withToken = (title, intro) =>
  `<h2>${title}</h2>\n<p>${intro}</p>\n<p style="font-size:24px"><strong>{{ .Token }}</strong></p>\n<p>También puedes <a href="{{ .ConfirmationURL }}">usar este enlace</a>.</p>\n<p>Si no solicitaste este correo, ignóralo.</p>`;

const payload = {
  smtp_admin_email: adminEmail,
  smtp_sender_name: senderName,
  smtp_host: host,
  smtp_port: port,
  smtp_user: user,
  smtp_pass: pass,
  rate_limit_email_sent: 30,
  mailer_templates_magic_link_content: withToken(
    'Epix — Tu código de acceso',
    'Ingresa este código en la app:</p><p>',
  ),
  mailer_templates_email_change_content: withToken(
    'Epix — Confirma tu nuevo correo',
    'Ingresa este código en la app:</p><p>',
  ),
};

const patch = await fetch(`${base}/config/auth`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify(payload),
});

if (patch.status !== 200) {
  console.error('Error configurando SMTP:', patch.status, await patch.text());
  process.exit(1);
}

const after = await (await fetch(`${base}/config/auth`, { headers })).json();
const ok = {
  smtp_host: after.smtp_host,
  smtp_port: after.smtp_port,
  remitente: after.smtp_admin_email,
  smtp_configurado: Boolean(after.smtp_pass),
  limite_envios_hora: after.rate_limit_email_sent,
  plantilla_magic_link_con_codigo: /\.Token/.test(after.mailer_templates_magic_link_content ?? ''),
  plantilla_email_change_con_codigo: /\.Token/.test(
    after.mailer_templates_email_change_content ?? '',
  ),
  longitud_codigo: after.mailer_otp_length,
  expiracion_segundos: after.mailer_otp_exp,
};

console.log('SMTP configurado ✓');
console.log(ok);

if (!Object.values(ok).every((value) => value !== false && value !== null)) {
  console.error('Verificación incompleta: revisa los valores anteriores.');
  process.exit(1);
}
