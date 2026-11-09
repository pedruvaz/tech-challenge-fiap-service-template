import { IsNotEmpty, IsString } from 'class-validator';

export class HelloRequestDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
