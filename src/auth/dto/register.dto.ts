import {
  IsEmail,
  IsStrongPassword,
  MinLength,
  MaxLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0,
  })
  password: string;

  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @MinLength(2)
  @MaxLength(100)
  businessName: string;
}
