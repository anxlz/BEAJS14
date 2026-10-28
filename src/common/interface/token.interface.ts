import type { JwtPayload } from "jsonwebtoken";

export interface ITokenPayload extends JwtPayload {
    sub: string;
    sid: string;
    jti: string;
    iat: number;
    exp: number;
}
