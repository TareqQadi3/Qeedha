export class DomainException extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainException';
  }
}

export class NotFoundException extends DomainException {
  constructor(entity: string) {
    super('NOT_FOUND', `${entity} not found`);
  }
}

export class ConflictException extends DomainException {
  constructor(message: string) {
    super('CONFLICT', message);
  }
}

export class ForbiddenException extends DomainException {
  constructor(message: string) {
    super('FORBIDDEN', message);
  }
}

export class UnauthorizedException extends DomainException {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message);
  }
}
