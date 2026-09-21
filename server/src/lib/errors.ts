export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super("Validation failed", 400, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

/** A downstream dependency (e.g. the AI provider) isn't configured or failed. */
export class ServiceUnavailableError extends AppError {
  constructor(message: string) {
    super(message, 503);
  }
}

/** No/invalid credentials. Deliberately generic so it never reveals which part was wrong. */
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401);
  }
}

/** Authenticated, but not allowed to do this (wrong tenant or role). */
export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to do that") {
    super(message, 403);
  }
}
