import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type JwtPayloadUser = {
  sub: string;
  phoneHash: string;
  role: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayloadUser => {
    const req = ctx.switchToHttp().getRequest<{ user: JwtPayloadUser }>();
    return req.user;
  },
);
