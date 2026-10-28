import { FACEBOOK, INSTAGRAM, TWITTER } from "../../../config.js";
import { EmailSubjectEnum } from "../../enum/index.js";

interface ITemplateData {
    title: string;
    code: number;
}

const layout = ({ title, message, code }: { title: string; message: string; code: number }): string => {
    return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:20px;background:#f2f2f2;font-family:Arial,sans-serif;">
  <div style="max-width:500px;margin:auto;background:#ffffff;border:1px solid #680c2a;">
    <div style="background:#680c2a;padding:24px;text-align:center;color:#ffffff;font-size:28px;">&#9993;</div>
    <div style="padding:24px;text-align:center;">
      <h2 style="color:#680c2a;margin:0 0 12px;">${title.replaceAll("_", " ")}</h2>
      <p style="color:#333333;">${message}</p>
      <div style="background:#680c2a;color:#ffffff;font-size:26px;letter-spacing:6px;padding:14px;margin:18px 0;">${code}</div>
      <p style="color:#888888;font-size:12px;">If you did not request this, you can ignore this email.</p>
    </div>
    <div style="background:#f2f2f2;padding:14px;text-align:center;font-size:13px;">
      <b>Stay in touch</b><br />
      <a href="${FACEBOOK}">Facebook</a> | <a href="${INSTAGRAM}">Instagram</a> | <a href="${TWITTER}">Twitter</a>
    </div>
  </div>
</body>
</html>`;
};

export const templates: Record<EmailSubjectEnum, (data: ITemplateData) => string> = {
    [EmailSubjectEnum.CONFIRM_EMAIL]: (data) =>
        layout({ ...data, message: "Use the code below to confirm your email address. It is valid for 2 minutes." }),
    [EmailSubjectEnum.FORGOT_PASSWORD]: (data) =>
        layout({ ...data, message: "Use the code below to reset your password. It is valid for 2 minutes." })
};

export const verifyEmailTemplate = (data: ITemplateData & { subject: EmailSubjectEnum }): string => {
    return templates[data.subject](data);
};
