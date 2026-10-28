import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { BadRequestException } from "../common/exception/index.js";

export const validation = (schema: ZodType) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse({
            body: req.body ?? {},
            params: req.params,
            query: req.query
        });

        if (!result.success) {
            throw new BadRequestException(
                "Validation error",
                result.error.issues.map((issue) => ({
                    path: issue.path.map(String).join("."),
                    message: issue.message
                }))
            );
        }

        req.validate = result.data;
        next();
    };
};
