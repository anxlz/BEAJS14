import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import {
    ACCESS_TOKEN_EXPIRES_IN,
    ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_EXPIRES_IN,
    REFRESH_TOKEN_SECRET
} from "../../config.js";
import { TokenTypeEnum } from "../enum/index.js";
import { UnauthorizedException } from "../exception/index.js";
import type { ITokenPayload } from "../interface/index.js";
import { UserRepository } from "../repository/index.js";
import { cacheService } from "../service/index.js";

const userRepository = new UserRepository();

const secretOf = (tokenType: TokenTypeEnum): string => {
    return tokenType === TokenTypeEnum.REFRESH ? REFRESH_TOKEN_SECRET : ACCESS_TOKEN_SECRET;
};

const expiresOf = (tokenType: TokenTypeEnum): number => {
    return tokenType === TokenTypeEnum.REFRESH ? REFRESH_TOKEN_EXPIRES_IN : ACCESS_TOKEN_EXPIRES_IN;
};

// One session = one access token + one refresh token (same sid)
export const UserRevokeSessionKey = ({ userId, sid }: { userId: string; sid: string }): string => {
    return `User::${userId}::Revoke_Session::${sid}`;
};

export const generateToken = ({
    userId,
    sid,
    tokenType,
    issuer
}: {
    userId: string;
    sid: string;
    tokenType: TokenTypeEnum;
    issuer: string;
}): string => {
    return jwt.sign({ sid }, secretOf(tokenType), {
        subject: userId,
        expiresIn: expiresOf(tokenType),
        jwtid: randomUUID(),
        issuer
    });
};

export const verifyToken = ({ token, tokenType }: { token: string; tokenType: TokenTypeEnum }): ITokenPayload => {
    try {
        const payload = jwt.verify(token, secretOf(tokenType));
        if (typeof payload === "string" || !payload.sub || !payload.sid) {
            throw new Error("Bad payload");
        }
        return payload as ITokenPayload;
    } catch (error) {
        throw new UnauthorizedException("Invalid or expired token");
    }
};

export const decodeToken = async ({ token, tokenType }: { token: string; tokenType: TokenTypeEnum }) => {
    const payload = verifyToken({ token, tokenType });

    if (await cacheService.exist({ key: UserRevokeSessionKey({ userId: payload.sub, sid: payload.sid }) })) {
        throw new UnauthorizedException("Expired login credentials");
    }

    const user = await userRepository.findById(payload.sub, undefined, { lean: true });
    if (!user) {
        throw new UnauthorizedException("Invalid user account");
    }

    // Logout From All Devices
    if (user.changeCredentialsTime && Math.floor(new Date(user.changeCredentialsTime).getTime() / 1000) > payload.iat) {
        throw new UnauthorizedException("Expired login credentials");
    }

    return { user, payload };
};

export const createLoginCredentials = ({ userId, issuer }: { userId: string; issuer: string }) => {
    const sid = randomUUID();
    return {
        access_token: generateToken({ userId, sid, tokenType: TokenTypeEnum.ACCESS, issuer }),
        refresh_token: generateToken({ userId, sid, tokenType: TokenTypeEnum.REFRESH, issuer })
    };
};

export const createRevokeSession = async ({ payload }: { payload: ITokenPayload }): Promise<void> => {
    await cacheService.set({
        key: UserRevokeSessionKey({ userId: payload.sub, sid: payload.sid }),
        value: true,
        ttl: REFRESH_TOKEN_EXPIRES_IN
    });
};
