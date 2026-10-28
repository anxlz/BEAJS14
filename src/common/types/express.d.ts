import type { IUser, ITokenPayload, RawDocument } from "../interface/index.js";

declare global {
    namespace Express {
        interface Request {
            user: RawDocument<IUser>;
            payload: ITokenPayload;
            validate: any;
        }
    }
}

export {};
