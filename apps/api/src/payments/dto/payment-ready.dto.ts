import { IsUUID } from 'class-validator';

export class PaymentReadyDto {
  @IsUUID()
  orderId: string;
}
