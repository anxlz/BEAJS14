import { EmailSubjectEnum } from "../enum/index.js";
import { ConflictException, TooManyRequestException } from "../exception/index.js";
import { cacheService } from "../service/index.js";
import { createOtp, emailEvent } from "../utils/index.js";
import { compare, hash } from "./hash.security.js";

export const UserEmailKey = ({ email, subject }: { email: string; subject: EmailSubjectEnum }): string => {
    return `User::${email}::${subject}::OTP`;
};

export const UserEmailTrailsKey = ({ email, subject }: { email: string; subject: EmailSubjectEnum }): string => {
    return `${UserEmailKey({ email, subject })}::Trails`;
};

export const UserEmailVerifyKey = ({ email, subject }: { email: string; subject: EmailSubjectEnum }): string => {
    return `${UserEmailKey({ email, subject })}::Verify`;
};

const MAX_WRONG_CODES = 5;

// expiresIn: otp life, maxTrials: sends allowed, blockInSeconds: block time
export const sendEmailOtp = async ({
    email,
    subject,
    expiresIn = 120,
    maxTrials = 3,
    blockInSeconds = 3600
}: {
    email: string;
    subject: EmailSubjectEnum;
    expiresIn?: number;
    maxTrials?: number;
    blockInSeconds?: number;
}): Promise<void> => {
    const existOtpTtl = await cacheService.ttl({ key: UserEmailKey({ email, subject }) });
    if (existOtpTtl > 0) {
        throw new TooManyRequestException(
            `Sorry we cannot create new otp while existing one still valid please try again later after ${existOtpTtl}s`
        );
    }

    const oldTrials = Number(await cacheService.get({ key: UserEmailTrailsKey({ email, subject }) })) || 0;
    if (oldTrials >= maxTrials) {
        throw new TooManyRequestException("Max otp trials has been reached, please try again later");
    }

    const code = createOtp();
    await cacheService.set({
        key: UserEmailKey({ email, subject }),
        value: await hash(code.toString()),
        ttl: expiresIn
    });
    await cacheService.incr({ key: UserEmailTrailsKey({ email, subject }) });
    await cacheService.expire({ key: UserEmailTrailsKey({ email, subject }), ttl: blockInSeconds });

    emailEvent.emit("sendEmail", { subject, recipients: { to: email }, data: { code } });
};

export const verifyEmailOtp = async ({
    email,
    subject,
    otp
}: {
    email: string;
    subject: EmailSubjectEnum;
    otp: string;
}): Promise<void> => {
    const otpKey = UserEmailKey({ email, subject });
    const verifyKey = UserEmailVerifyKey({ email, subject });

    const hashedOtp = await cacheService.get({ key: otpKey });
    if (!hashedOtp) {
        throw new ConflictException("Invalid or expired OTP");
    }

    if (!(await compare(otp, hashedOtp))) {
        const wrongCodes = await cacheService.incr({ key: verifyKey });
        await cacheService.expire({ key: verifyKey, ttl: 600 });
        if (wrongCodes >= MAX_WRONG_CODES) {
            await cacheService.del({ key: [otpKey, verifyKey] });
            throw new TooManyRequestException("Too many wrong codes, please request a new code");
        }
        throw new ConflictException("Invalid or expired OTP");
    }

    await cacheService.del({ key: [otpKey, verifyKey, UserEmailTrailsKey({ email, subject })] });
};
