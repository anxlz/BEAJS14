import type { NextFunction, Request, Response } from "express";
import { NODE_ENV } from "../config.js";

export const globalErrorHandling = (error: any, req: Request, res: Response, next: NextFunction): void => {
    const status: number = error?.cause?.status ?? 500;
    res.status(status).json({
        message: error?.message || "Server error",
        status,
        issues: error?.cause?.issues,
        stack: NODE_ENV === "production" ? undefined : error?.stack
    });
};
