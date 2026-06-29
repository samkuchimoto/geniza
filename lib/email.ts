import nodemailer from 'nodemailer'
import type { EmailEvent } from '@/types'

// ============================================================
// Transport — Gmail SMTP via App Password
// Setup: https://myaccount.google.com/apppasswords
// ============================================================
function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
  })
}

// ============================================================
// Email templates
// ============================================================
interface TemplateData {
  subject: string
  html: string
}

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GENIZA</title>
</head>
<body style="margin:0;padding:0;background:#F7F3EC;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation"
               style="background:#FDFAF5;border:1px solid #E8E0D4;max-width:560px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="padding:28px 36px 20px;border-bottom:1px solid #E8E0D4;">
              <span style="font-family:Georgia,serif;font-size:22px;font-weight:500;
                           color:#0D0C0A;letter-spacing:-0.01em;">GENIZA</span>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding:32px 36px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px 28px;border-top:1px solid #E8E0D4;">
              <p style="margin:0;font-size:12px;color:#8C7B6B;line-height:1.5;">
                Tu reçois cet email car tu as un compte sur GENIZA.<br>
                <a href="https://geniza.exchange" style="color:#B8860B;text-decoration:none;">geniza.exchange</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function getTemplate(event: EmailEvent, data: Record<string, string>): TemplateData {
  const cta = (text: string, url: string) =>
    `<a href="${url}" style="display:inline-block;background:#0D0C0A;color:#F7F3EC;
       padding:12px 24px;text-decoration:none;font-size:13px;font-weight:500;
       margin-top:24px;">${text}</a>`

  const h1 = (text: string) =>
    `<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;
               font-weight:500;color:#0D0C0A;line-height:1.2;">${text}</h1>`

  const p = (text: string) =>
    `<p style="margin:0 0 12px;font-size:15px;color:#0D0C0A;line-height:1.6;">${text}</p>`

  const detail = (label: string, value: string) =>
    `<tr>
       <td style="padding:8px 12px 8px 0;font-size:12px;color:#8C7B6B;
                  font-family:monospace;letter-spacing:0.04em;white-space:nowrap;
                  vertical-align:top;">${label.toUpperCase()}</td>
       <td style="padding:8px 0;font-size:14px;color:#0D0C0A;">${value}</td>
     </tr>`

  const table = (rows: string) =>
    `<table style="width:100%;border-top:1px solid #E8E0D4;margin-top:20px;">${rows}</table>`

  switch (event) {
    case 'trade_received':
      return {
        subject: `Nouvelle proposition d'échange — ${data.item_title}`,
        html: baseLayout(`
          ${h1('Tu as reçu une proposition d\'échange')}
          ${p(`<strong>${data.proposer_name}</strong> propose d'échanger son objet contre le tien.`)}
          ${table(
            detail('Ton objet', data.receiver_item_title) +
            detail('Proposé en échange', data.proposer_item_title) +
            (data.cash_top_up && data.cash_top_up !== '0'
              ? detail('Complément cash', `+ ${data.cash_top_up} €`)
              : '') +
            (data.message ? detail('Message', data.message) : '') +
            detail('Expire le', data.expires_at)
          )}
          ${cta('Voir la proposition', data.trade_url)}
        `),
      }

    case 'trade_accepted':
      return {
        subject: `Proposition acceptée — ${data.item_title}`,
        html: baseLayout(`
          ${h1('Ta proposition a été acceptée')}
          ${p(`<strong>${data.receiver_name}</strong> a accepté ton échange.`)}
          ${table(
            detail('Échange', `${data.proposer_item_title} ↔ ${data.receiver_item_title}`)
          )}
          ${p('Coordonnez-vous pour l\'envoi. Les deux objets sont maintenant réservés.')}
          ${cta('Gérer l\'échange', data.trade_url)}
        `),
      }

    case 'trade_declined':
      return {
        subject: `Proposition refusée — ${data.item_title}`,
        html: baseLayout(`
          ${h1('Ta proposition a été refusée')}
          ${p(`<strong>${data.receiver_name}</strong> n'a pas retenu ta proposition.`)}
          ${p('Ton objet est à nouveau disponible pour d\'autres échanges.')}
          ${cta('Retourner au catalogue', `${process.env.NEXT_PUBLIC_BASE_URL}/browse`)}
        `),
      }

    case 'trade_expired':
      return {
        subject: `Proposition expirée — ${data.item_title}`,
        html: baseLayout(`
          ${h1('Une proposition d\'échange a expiré')}
          ${p('La proposition n\'a pas reçu de réponse dans les 7 jours. Les deux objets sont à nouveau disponibles.')}
          ${cta('Retourner au catalogue', `${process.env.NEXT_PUBLIC_BASE_URL}/browse`)}
        `),
      }

    case 'sale_confirmed':
      return {
        subject: `Paiement reçu — ${data.item_title}`,
        html: baseLayout(`
          ${h1('Ton objet a été vendu')}
          ${p(`<strong>${data.buyer_name}</strong> a payé pour ton objet.`)}
          ${table(
            detail('Objet', data.item_title) +
            detail('Montant', `${data.amount_eur} €`) +
            detail('Frais plateforme (6%)', `${data.fee_eur} €`) +
            detail('Net reçu', `${data.net_eur} €`)
          )}
          ${p('Prépare l\'envoi et marque l\'objet comme expédié depuis ton tableau de bord.')}
          ${cta('Gérer l\'expédition', data.dashboard_url)}
        `),
      }

    case 'item_to_ship':
      return {
        subject: `Rappel: objet à expédier — ${data.item_title}`,
        html: baseLayout(`
          ${h1('Tu as un objet à expédier')}
          ${p(`L'acheteur <strong>${data.buyer_name}</strong> attend ton envoi.`)}
          ${table(detail('Objet', data.item_title))}
          ${p('Marque l\'objet comme expédié dès l\'envoi.')}
          ${cta('Tableau de bord', data.dashboard_url)}
        `),
      }

    case 'shipment_to_confirm':
      return {
        subject: `Ton achat est en route — ${data.item_title}`,
        html: baseLayout(`
          ${h1('Ton achat a été expédié')}
          ${p(`<strong>${data.seller_name}</strong> a expédié ton objet.`)}
          ${table(detail('Objet', data.item_title))}
          ${p('À réception, confirme la livraison depuis ton tableau de bord pour libérer le paiement au vendeur.')}
          ${cta('Confirmer la réception', data.dashboard_url)}
        `),
      }

    default:
      return {
        subject: 'Notification GENIZA',
        html: baseLayout(`${h1('Notification')}${p('Un événement s\'est produit sur ton compte GENIZA.')}`),
      }
  }
}

// ============================================================
// Public send function
// ============================================================
export async function sendEmail(
  event: EmailEvent,
  to: string,
  data: Record<string, string>
): Promise<void> {
  const transporter = getTransporter()
  const template = getTemplate(event, data)

  await transporter.sendMail({
    from: `GENIZA <${process.env.GMAIL_USER}>`,
    to,
    subject: template.subject,
    html: template.html,
  })
}
