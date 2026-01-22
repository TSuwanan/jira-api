import { ZodError } from "zod";
import type { Context } from "elysia";

// Custom error classes
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, "VALIDATION_ERROR");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(403, message, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(404, message, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
  }
}

// Database error type
interface DatabaseError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
}

// Error handler function
export function handleError(error: unknown, set: Context["set"]) {
  // Zod validation errors
  if (error instanceof ZodError) {
    set.status = 400;
    return {
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
      })),
    };
  }

  // Custom application errors
  if (error instanceof AppError) {
    set.status = error.statusCode;
    return {
      error: error.message,
      code: error.code,
    };
  }

  // PostgreSQL database errors
  const dbError = error as DatabaseError;
  if (dbError.code) {
    // Unique constraint violation
    if (dbError.code === "23505") {
      set.status = 409;
      return {
        error: "Resource already exists",
        code: "DUPLICATE_ENTRY",
        detail: dbError.detail,
      };
    }

    // Foreign key violation
    if (dbError.code === "23503") {
      set.status = 400;
      return {
        error: "Referenced resource does not exist",
        code: "FOREIGN_KEY_VIOLATION",
        detail: dbError.detail,
      };
    }

    // Not null violation
    if (dbError.code === "23502") {
      set.status = 400;
      return {
        error: "Required field is missing",
        code: "NOT_NULL_VIOLATION",
        detail: dbError.detail,
      };
    }
  }

  // Legacy error message handling (for backward compatibility)
  if (error instanceof Error) {
    if (error.message === "Email already exists") {
      set.status = 409;
      return { error: error.message, code: "EMAIL_EXISTS" };
    }

    if (error.message === "Invalid credentials") {
      set.status = 401;
      return { error: error.message, code: "INVALID_CREDENTIALS" };
    }

    if (error.message === "User not found") {
      set.status = 404;
      return { error: error.message, code: "USER_NOT_FOUND" };
    }

    if (error.message === "Unauthorized") {
      set.status = 401;
      return { error: error.message, code: "UNAUTHORIZED" };
    }
  }

  // Unknown server errors
  console.error("Server error:", error);
  set.status = 500;
  return {
    error: "Internal server error",
    code: "INTERNAL_ERROR",
  };
}