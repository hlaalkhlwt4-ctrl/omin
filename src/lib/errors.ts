import { NextResponse } from 'next/server';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function toErrorResponse(error: unknown, fallback = 'حدث خطأ غير متوقع.') {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.', code: 'INVALID_JSON' }, { status: 400 });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(error);
  }

  return NextResponse.json({ error: fallback, code: 'INTERNAL_ERROR' }, { status: 500 });
}
