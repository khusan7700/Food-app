import { OrderStatus } from '@order-eats/types';
import { IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsIn(Object.values(OrderStatus))
  status: OrderStatus;
}
