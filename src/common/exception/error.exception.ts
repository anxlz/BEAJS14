export class ApplicationException extends Error {
    constructor(message: string, status: number, issues?: unknown) {
        super(message, { cause: { status, issues } });
        this.name = this.constructor.name;
    }
}

export class BadRequestException extends ApplicationException {
    constructor(message = "Bad Request", issues?: unknown) {
        super(message, 400, issues);
    }
}

export class UnauthorizedException extends ApplicationException {
    constructor(message = "Unauthorized", issues?: unknown) {
        super(message, 401, issues);
    }
}

export class ForbiddenException extends ApplicationException {
    constructor(message = "Forbidden", issues?: unknown) {
        super(message, 403, issues);
    }
}

export class NotFoundException extends ApplicationException {
    constructor(message = "Not Found", issues?: unknown) {
        super(message, 404, issues);
    }
}

export class ConflictException extends ApplicationException {
    constructor(message = "Conflict", issues?: unknown) {
        super(message, 409, issues);
    }
}

export class TooManyRequestException extends ApplicationException {
    constructor(message = "Too Many Requests", issues?: unknown) {
        super(message, 429, issues);
    }
}
