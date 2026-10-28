import nodemailer from "nodemailer";
import { APP_EMAIL, APP_PASSWORD } from "../../../config.js";
import { BadRequestException } from "../../exception/index.js";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: APP_EMAIL,
        pass: APP_PASSWORD
    }
});

export const sendEmail = async ({
    to,
    cc,
    bcc,
    subject,
    text,
    html
}: {
    to?: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
}) => {
    if (!to?.length && !cc?.length && !bcc?.length) {
        throw new BadRequestException("Invalid recipients");
    }
    if (!html?.length && !text?.length) {
        throw new BadRequestException("Invalid content");
    }
    const info = await transporter.sendMail({
        from: `"Social App" <${APP_EMAIL}>`,
        to,
        cc,
        bcc,
        subject,
        text,
        html
    });
    console.log(`Message sent: ${info.messageId}`);
    return info;
};
