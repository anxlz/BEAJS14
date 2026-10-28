import type { Response } from "express";

export const successResponse = <T>({
    res,
    status = 200,
    message = "Done",
    data
}: {
    res: Response;
    status?: number;
    message?: string;
    data?: T;
}): Response => {
    return res.status(status).json({ message, status, data });
};
