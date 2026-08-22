import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface MerchantContext {
  merchantId: string;
}

export const CurrentMerchant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): MerchantContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.merchantContext as MerchantContext;
  },
);
