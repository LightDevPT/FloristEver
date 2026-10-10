export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function ok(res, data, status = 200) {
  res.status(status).json({ ok: true, data });
}

export function created(res, data) {
  ok(res, data, 201);
}
