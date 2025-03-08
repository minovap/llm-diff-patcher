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

export class HunkHeaderCountMismatchError extends BaseError {
  static readonly DEFAULT_MESSAGE = `Invalid line prefix. Valid prefixes within a hunk are '+', '-', ' ', and '\\'`;

  constructor(context: string = '', message?: string) {
    super(message || HunkHeaderCountMismatchError.DEFAULT_MESSAGE, context);
  }
}

export class NotEnoughContextError extends BaseError {
  static readonly DEFAULT_MESSAGE = 'Hunk is missing context to apply patch';

  constructor(context: string = '', message?: string) {
    super(message || NotEnoughContextError.DEFAULT_MESSAGE, context);
  }
}

export class NoEditsInHunkError extends BaseError {
  static readonly DEFAULT_MESSAGE = 'Could not find any edits in hunk';

  constructor(context: string = '', message?: string) {
    super(message || NoEditsInHunkError.DEFAULT_MESSAGE, context);
  }
}

export class InsufficientContextLinesError extends BaseError {
  static readonly DEFAULT_MESSAGE = 'Insufficient context lines in hunk';

  constructor(context: string = '', required: number, actual: number) {
    const message = `${InsufficientContextLinesError.DEFAULT_MESSAGE}: required ${required}, found ${actual}`;
    super(message, context);
  }
}