import https from "https";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
// Use official domain if verified, otherwise default to onboarding sender
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "PrepDesk <onboarding@resend.dev>";

interface SendOtpOptions {
  to: string;
  code: string;
  type: "LOGIN_2FA" | "FORGOT_PASSWORD";
  studentName?: string;
}

export async function sendOtpEmail({
  to,
  code,
  type,
  studentName = "Scholar",
}: SendOtpOptions): Promise<{ success: boolean; error?: string; id?: string }> {
  console.log(`\n========================================`);
  console.log(`[PREPDESK OTP SERVICE]`);
  console.log(`Type:       ${type}`);
  console.log(`Recipient:  ${to}`);
  console.log(`OTP Code:   ${code}`);
  console.log(`Valid for:  10 minutes`);
  console.log(`========================================\n`);

  const isReset = type === "FORGOT_PASSWORD";
  const title = isReset ? "Password Reset Verification" : "Sign-In Verification Code";
  const subtitle = isReset
    ? "You requested to reset your PrepDesk account password."
    : "Two-Factor verification required to access your PrepDesk account.";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #08090c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e4e7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #08090c; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #11141d; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; background: linear-gradient(180deg, rgba(99, 102, 241, 0.12) 0%, rgba(17, 20, 29, 0) 100%);">
              <div style="display: inline-block; padding: 6px 14px; background-color: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #a5b4fc; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px;">
                PrepDesk &bull; CAT 2027
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">
                ${title}
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #a1a1aa; line-height: 1.5;">
                Hello ${studentName}, ${subtitle}
              </p>
            </td>
          </tr>

          <!-- OTP Box -->
          <tr>
            <td style="padding: 10px 32px 25px 32px; text-align: center;">
              <div style="background-color: rgba(0, 0, 0, 0.4); border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 16px; padding: 24px; margin: 15px 0;">
                <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em; color: #818cf8; display: block; margin-bottom: 10px;">
                  Your Verification Code
                </span>
                <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 0.25em; color: #ffffff; text-shadow: 0 0 20px rgba(99, 102, 241, 0.5);">
                  ${code}
                </span>
                <span style="display: block; margin-top: 10px; font-size: 12px; color: #71717a;">
                  Expires in <strong>10 minutes</strong> &bull; Single-use only
                </span>
              </div>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <p style="margin: 0; font-size: 12px; color: #71717a; line-height: 1.6; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px;">
                Never share this verification code with anyone. PrepDesk administrators will never ask for your code. If you did not initiate this request, your account may be compromised &mdash; please alert your mentor immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px; background-color: rgba(0, 0, 0, 0.3); border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #52525b;">
                PrepDesk CAT 2027 Class Platform &bull; <a href="https://catdesk.online" style="color: #6366f1; text-decoration: none;">catdesk.online</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return new Promise((resolve) => {
    // Try primary sender, or fallback if needed
    const payload = JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: `[${code}] ${title} — PrepDesk`,
      html: htmlContent,
    });

    const req = https.request(
      {
        hostname: "api.resend.com",
        path: "/emails",
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let resBody = "";
        res.on("data", (chunk) => (resBody += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(resBody);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true, id: parsed.id });
            } else {
              console.warn(`[Resend Error ${res.statusCode}]:`, parsed);
              resolve({
                success: false,
                error: parsed.message || `Resend error code ${res.statusCode}`,
              });
            }
          } catch (e) {
            resolve({ success: false, error: "Invalid response from email provider" });
          }
        });
      }
    );

    req.on("error", (e) => {
      console.error("[Resend Network Error]:", e.message);
      resolve({ success: false, error: e.message });
    });

    req.write(payload);
    req.end();
  });
}
