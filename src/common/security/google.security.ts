import { OAuth2Client } from "google-auth-library";
import type { TokenPayload } from "google-auth-library";
import { GOOGLE_CLIENT_ID } from "../../config.js";
import { UnauthorizedException } from "../exception/index.js";

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export const verifyGoogleToken = async (idToken: string): Promise<TokenPayload> => {
    let payload: TokenPayload | undefined;
    try {
        const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
        payload = ticket.getPayload();
    } catch (error) {
        throw new UnauthorizedException("Invalid google token");
    }
    if (!payload?.email || !payload.email_verified) {
        throw new UnauthorizedException("Google email is not verified");
    }
    return payload;
};
