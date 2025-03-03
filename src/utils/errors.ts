// Base error class with context
export class BaseError extends Error {
  context: string;

  constructor(message: string, context: string = '') {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      context: this.context
    };
  }
}

// PatchFormatError with optional message parameter
export class PatchFormatError extends BaseError {
  static readonly DEFAULT_MESSAGE = `Invalid line prefix. Valid prefixes within a hunk are '+', '-', ' ', and '\\'`;

  constructor(context: string = '', message?: string) {
    super(message || PatchFormatError.DEFAULT_MESSAGE, context);
  }
}