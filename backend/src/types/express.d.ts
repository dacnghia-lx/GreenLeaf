// Bổ sung kiểu cho req.user (payload JWT do middleware requireAuth gắn vào)
import type { Role } from '@prisma/client';

export interface JwtUser {
  id: number;
  role: Role;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}
