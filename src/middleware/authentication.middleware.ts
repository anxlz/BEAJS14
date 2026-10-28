import type { NextFunction, Request, Response } from "express";
import { TokenTypeEnum } from "../common/enum/index.js";
import { UnauthorizedException } from "../common/exception/index.js";
import { decodeToken } from "../common/security/index.js";

export const authentication = (tokenType: TokenTypeEnum = TokenTypeEnum.ACCESS) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { authorization } = req.headers;
        if (!authorization) {
            throw new UnauthorizedException("Authorization header is required");
        }

        const [scheme, token] = authorization.split(" ");
        if (scheme !== "Bearer" || !token) {
            throw new UnauthorizedException("Invalid authorization format");
        }

        const { user, payload } = await decodeToken({ token, tokenType });
        req.user = user;
        req.payload = payload;
        next();
    };
};
