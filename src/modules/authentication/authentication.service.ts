import { EmailSubjectEnum, LogoutEnum, ProviderEnum } from "../../common/enum/index.js";
import {
    ConflictException,
    ForbiddenException,
    NotFoundException,
    TooManyRequestException,
    UnauthorizedException
} from "../../common/exception/index.js";
import type { ITokenPayload, IUser, RawDocument } from "../../common/interface/index.js";
import { UserRepository } from "../../common/repository/index.js";
import {
    compare,
    createLoginCredentials,
    createRevokeSession,
    encryption,
    hash,
    sendEmailOtp,
    verifyEmailOtp,
    verifyGoogleToken
} from "../../common/security/index.js";
import { cacheService } from "../../common/service/index.js";
import type { CacheService } from "../../common/service/index.js";
import type {
    ConfirmEmailDto,
    ForgotPasswordDto,
    LoginDto,
    LoginWithGmailDto,
    LogoutDto,
    ResendConfirmEmailDto,
    ResetPasswordDto,
    SignupDto
} from "./dto/index.js";

const MAX_LOGIN_TRIALS = 5;
const LOGIN_BLOCK_SECONDS = 5 * 60;
const LOGIN_TRIALS_WINDOW_SECONDS = 15 * 60;

export const LoginTrailsKey = (email: string): string => `User::${email}::Login::Trails`;
export const LoginBlockedKey = (email: string): string => `User::${email}::Login::Blocked`;

const cleanName = (value: string | undefined, fallback: string): string => {
    const name = (value ?? "").trim().slice(0, 25);
    return name.length >= 2 ? name : fallback;
};

export class AuthenticationService {
    constructor(
        private readonly userRepository: UserRepository = new UserRepository(),
        private readonly cache: CacheService = cacheService
    ) {}

    // 1. Registration
    async signup(dto: SignupDto) {
        const email = dto.email.toLowerCase();
        const duplicated = await this.userRepository.findOne({ email }, "_id", { lean: true });
        if (duplicated) {
            throw new ConflictException("Email already exists");
        }

        const [firstName, lastName] = dto.username.split(" ") as [string, string];
        const user = await this.userRepository.create({
            firstName,
            lastName,
            email,
            password: await hash(dto.password),
            phone: dto.phone ? await encryption(dto.phone) : undefined,
            provider: ProviderEnum.SYSTEM
        });

        await sendEmailOtp({ email, subject: EmailSubjectEnum.CONFIRM_EMAIL });
        return { id: String(user._id), username: dto.username, email };
    }

    // 1. Email verification
    async confirmEmail(dto: ConfirmEmailDto) {
        const email = dto.email.toLowerCase();
        const user = await this.userRepository.findOne(
            { email, provider: ProviderEnum.SYSTEM, confirmEmail: null },
            "_id",
            { lean: true }
        );
        if (!user) {
            throw new NotFoundException("Invalid account");
        }

        await verifyEmailOtp({ email, subject: EmailSubjectEnum.CONFIRM_EMAIL, otp: dto.otp });
        await this.userRepository.updateOne({ _id: user._id }, { $set: { confirmEmail: new Date() } });
        return { confirmed: true };
    }

    async resendConfirmEmail(dto: ResendConfirmEmailDto) {
        const email = dto.email.toLowerCase();
        const user = await this.userRepository.findOne(
            { email, provider: ProviderEnum.SYSTEM, confirmEmail: null },
            "_id",
            { lean: true }
        );
        if (!user) {
            throw new NotFoundException("Invalid account");
        }

        await sendEmailOtp({ email, subject: EmailSubjectEnum.CONFIRM_EMAIL });
        return { sent: true };
    }

    // 2. Login and session generation
    async login(dto: LoginDto, issuer: string) {
        const email = dto.email.toLowerCase();

        const blockedTtl = await this.cache.ttl({ key: LoginBlockedKey(email) });
        if (blockedTtl > 0) {
            throw new TooManyRequestException(
                `Account temporarily banned because of failed login attempts, try again after ${blockedTtl}s`
            );
        }

        const user = await this.userRepository.findOne({ email }, "+password", { lean: true });
        const validLogin =
            !!user && user.provider === ProviderEnum.SYSTEM && !!user.password
                ? await compare(dto.password, user.password)
                : false;

        if (!user || !validLogin) {
            const trials = await this.cache.incr({ key: LoginTrailsKey(email) });
            if (trials === 1) {
                await this.cache.expire({ key: LoginTrailsKey(email), ttl: LOGIN_TRIALS_WINDOW_SECONDS });
            }
            if (trials >= MAX_LOGIN_TRIALS) {
                await this.cache.set({ key: LoginBlockedKey(email), value: true, ttl: LOGIN_BLOCK_SECONDS });
                await this.cache.del({ key: LoginTrailsKey(email) });
            }
            throw new UnauthorizedException("Invalid login credentials");
        }

        if (!user.confirmEmail) {
            throw new ForbiddenException("Please confirm your email first");
        }

        await this.cache.del({ key: LoginTrailsKey(email) });
        return createLoginCredentials({ userId: String(user._id), issuer });
    }

    // 5. OAuth 2.0 (Google sign-in)
    async loginWithGmail(dto: LoginWithGmailDto, issuer: string) {
        const googleUser = await verifyGoogleToken(dto.idToken);
        const email = (googleUser.email as string).toLowerCase();

        const user = await this.userRepository.findOne({ email }, "_id confirmEmail", { lean: true });
        if (!user) {
            const created = await this.userRepository.create({
                firstName: cleanName(googleUser.given_name ?? googleUser.name, "Google"),
                lastName: cleanName(googleUser.family_name, "User"),
                email,
                image: googleUser.picture,
                provider: ProviderEnum.GOOGLE,
                confirmEmail: new Date()
            });
            return createLoginCredentials({ userId: String(created._id), issuer });
        }

        // Google already verified this email
        if (!user.confirmEmail) {
            await this.userRepository.updateOne({ _id: user._id }, { $set: { confirmEmail: new Date() } });
        }
        return createLoginCredentials({ userId: String(user._id), issuer });
    }

    // 3. Token refreshing (old session is revoked, a new one is created)
    async rotateToken({ user, payload }: { user: RawDocument<IUser>; payload: ITokenPayload }, issuer: string) {
        await createRevokeSession({ payload });
        return createLoginCredentials({ userId: String(user._id), issuer });
    }

    // 3. Token revocation
    async logout({ user, payload }: { user: RawDocument<IUser>; payload: ITokenPayload }, dto: LogoutDto) {
        if (dto.action === LogoutEnum.ALL) {
            await this.userRepository.updateOne({ _id: user._id }, { $set: { changeCredentialsTime: new Date() } });
        }
        await createRevokeSession({ payload });
        return { loggedOut: true, allDevices: dto.action === LogoutEnum.ALL };
    }

    // 4. Password reset (step 1: send otp)
    async forgotPassword(dto: ForgotPasswordDto) {
        const email = dto.email.toLowerCase();
        const user = await this.userRepository.findOne(
            { email, provider: ProviderEnum.SYSTEM, confirmEmail: { $ne: null } },
            "_id",
            { lean: true }
        );
        // Same answer if the account does not exist
        if (user) {
            await sendEmailOtp({ email, subject: EmailSubjectEnum.FORGOT_PASSWORD });
        }
        return { sent: true };
    }

    // 4. Password reset (step 2: verify otp and set the new password)
    async resetPassword(dto: ResetPasswordDto) {
        const email = dto.email.toLowerCase();
        const user = await this.userRepository.findOne(
            { email, provider: ProviderEnum.SYSTEM, confirmEmail: { $ne: null } },
            "_id",
            { lean: true }
        );
        if (!user) {
            throw new ConflictException("Invalid or expired OTP");
        }

        await verifyEmailOtp({ email, subject: EmailSubjectEnum.FORGOT_PASSWORD, otp: dto.otp });
        await this.userRepository.updateOne(
            { _id: user._id },
            { $set: { password: await hash(dto.password), changeCredentialsTime: new Date() } }
        );
        await this.cache.del({ key: [LoginTrailsKey(email), LoginBlockedKey(email)] });
        return { reset: true };
    }
}

export const authenticationService = new AuthenticationService();
