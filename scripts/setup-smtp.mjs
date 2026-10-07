#!/usr/bin/env node
/**
 * Configura el SMTP propio de Supabase para Epix (habilita códigos OTP reales
 * y sube el límite de envíos). Requiere en el entorno:
 *
 *   SUPABASE_ACCESS_TOKEN   token personal de Supabase (dashboard → Account → Access Tokens)
 *   RESEND_API_KEY          API key de Resend (re_...)   [o el SMTP de tu proveedor]
 *   SMTP_ADMIN_EMAIL        remitente/administrador, p. ej.:
 *                             - pruebas:  onboarding@resend.dev  (Resend solo entrega al correo dueño)
 *                             - producc.: no-reply@tudominio.com (requiere dominio verificado en Resend)
 *   SMTP_SENDER_NAME        opcional (por defecto «Epix»)
 *   SUPABASE_PROJECT_REF    opcional (por defecto el proyecto epix-db)
 *
 * Uso:  node scripts/setup-smtp.mjs
 * (Los secretos se leen del entorno; nunca se imprimen.)
 */
const HOST = 'smtp.resend.com';
const PORT = '465';
const USER = 'resend';

const ref = process.env.SUPABASE_PROJECT_REF ?? 'qeadwdtzqgbdbrczhkuf';
const token = process.env.SUPABASE_ACCESS_TOKEN;
const resendKey = process.env.RESEND_API_KEY;
const adminEmail = process.env.SMTP_ADMIN_EMAIL;
const senderName = process.env.SMTP_SENDER_NAME ?? 'Epix';

const missing = [
  ['SUPABASE_ACCESS_TOKEN', token],
  ['RESEND_API_KEY', resendKey],
  ['SMTP_ADMIN_EMAIL', adminEmail],
].filter(([, value]) => !value);

if (missing.length > 0) {
  console.error('Faltan variables de entorno:', missing.map(([name]) => name).join(', '));
  console.error('Ponlas en ~/.config/secrets.env (no se imprimen) y reintenta:');
  console.error('  set -a; . ~/.config/secrets.env; set +a; node scripts/setup-smtp.mjs');
  process.exit(1);
}

const base = `https://api.supabase.com/v1/projects/${ref}`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const withToken = (title, intro) =>
  `<h2>${title}</h2>\n<p>${intro}</p>\n<p style="font-size:24px"><strong>{{ .Token }}</strong></p>\n<p>También puedes <a href="{{ .ConfirmationURL }}">usar este enlace</a>.</p>\n<p>Si no solicitaste este correo, ignóralo.</p>`;

const payload = {
  smtp_admin_email: adminEmail,
  smtp_sender_name: senderName,
  smtp_host: HOST,
  smtp_port: PORT,
  smtp_user: USER,
  smtp_pass: resendKey,
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
};

console.log('SMTP configurado ✓');
console.log(ok);

if (!Object.values(ok).every((value) => value !== false && value !== null)) {
  console.error('Verificación incompleta: revisa los valores anteriores.');
  process.exit(1);
}
