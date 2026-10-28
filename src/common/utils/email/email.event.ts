import { EventEmitter } from "node:events";
import { EmailSubjectEnum } from "../../enum/index.js";
import { sendEmail } from "./send.email.js";
import { verifyEmailTemplate } from "./email.template.js";

export const emailEvent = new EventEmitter();

emailEvent.on(
    "sendEmail",
    async ({
        subject = EmailSubjectEnum.CONFIRM_EMAIL,
        recipients,
        data
    }: {
        subject?: EmailSubjectEnum;
        recipients: { to: string };
        data: { code: number };
    }) => {
        try {
            await sendEmail({
                ...recipients,
                subject: subject.replaceAll("_", " "),
                html: verifyEmailTemplate({ subject, title: subject, code: data.code })
            });
        } catch (error) {
            console.log(error);
        }
    }
);
