import { IsNotEmpty, IsString } from 'class-validator';

export class EscrowRefundDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
