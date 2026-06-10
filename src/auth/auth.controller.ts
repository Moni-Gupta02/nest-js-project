import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RegisterDto } from './dto/create-user.dto';
// import { Public } from 'src/common/decorators';
import { LoginDto } from './dto/login.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { message } from 'src/common/assets';
import { handleUnexpectedError } from 'src/common/utils/utils';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { Public } from 'src/common/decorators';
import { UserListFilterDto } from './dto/user-list.dto';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';
// import { Permissions } from 'src/common/decorators/permission.decorator';

@Controller('auth')
@ApiTags('Auth')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly adminHistoryService: AdminHistoryService,
  ) {}

  @Post('login')
  @Public()
  async login(@Body() loginDto: LoginDto) {
    try {
      console.log('user', process.env.JWT_SECRET);
      const result = await this.authService.login(
        loginDto.email,
        loginDto.password,
      );

      if (result === message.auth.INVALID_CREDENTIALS) {
        await this.adminHistoryService.createAdminHistory(
          'RMS_LOGIN_FAILED',
          loginDto,
          null,
          {},
          {},
          { login_details: message.auth.INVALID_CREDENTIALS },
        );
        throw new HttpException(
          { message: message.auth.INVALID_CREDENTIALS, status: false },
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.adminHistoryService.createAdminHistory(
        'RMS_LOGIN',
        loginDto,
        null,
        {},
        {},
        { login_details: message.auth.LOGIN_SUCCESS },
      );
      return {
        message: message.auth.LOGIN_SUCCESS,
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException to preserve the status code
      } else {
        // For other unexpected errors
        throw new HttpException(
          { message: 'Internal server error', error: error.message },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  @Post('register')
  @Permissions({ resource: 'auth', actions: 'create' })
  async register(@Body() registerDto: RegisterDto) {
    try {
      const result = await this.authService.register(
        registerDto.email,
        registerDto.password,
        registerDto.role,
        registerDto.name,
        registerDto.permissions,
      );
      return {
        message: message.auth.CREATE_SUCCESS,
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException to preserve the status code
      } else {
        // For other unexpected errors
        throw new HttpException(
          { message: 'Internal server error', error: error.message },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
  @Put('update/:userId')
  @Permissions({ resource: 'auth', actions: 'update' })
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    try {
      const result = await this.authService.updateUser(userId, updateUserDto);
      return {
        message: 'Update user details successfully',
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException to preserve the status code
      } else {
        // For other unexpected errors
        throw new HttpException(
          { message: 'Internal server error', error: error.message },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  @Get('profile/:userId')
  @Permissions({ resource: 'auth', actions: 'read' })
  async getUserProfile(@Param('userId') userId: string) {
    try {
      const result = await this.authService.getUserProfile(userId);
      console.log(result);
      if (!result) {
        throw new HttpException(
          { message: 'User is not avalible', status: false },
          HttpStatus.BAD_REQUEST,
        );
      }
      return {
        message: message.auth.GET_DETAILS,
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException to preserve the status code
      } else {
        // For other unexpected errors
        throw new HttpException(
          { message: 'Internal server error', error: error.message },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  @Get('list')
  @Permissions({ resource: 'auth', actions: 'list' })
  //
  async listUsers(@Req() request: Request, @Query() query: UserListFilterDto) {
    try {
      const user = request['user'];
      console.log('User from token:', user);
      const result = await this.authService.listUsers(query);
      return {
        message: message.auth.GET_DETAILS,
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException to preserve the status code
      } else {
        // For other unexpected errors
        throw new HttpException(
          { message: 'Internal server error', error: error.message },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  @Delete('delete/:userId')
  @Permissions({ resource: 'auth', actions: 'delete' })
  async deleteUser(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.authService.deleteUser(userId);
  }

  @Get('detail-by-token')
  @Permissions({ resource: 'public', actions: 'read' })
  async getDetailsByToken(@Req() request: Request) {
    try {
      const user = request['user'];
      console.log(user);
      console.log('User from token:', user);
      const data = await this.authService.getUserData(user._id);
      if (!data) {
        throw new HttpException(
          {
            message: message.auth.INVALID_USER,
            error: message.auth.INVALID_USER,
            status: false,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
      return {
        message: message.auth.GET_DETAILS,
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException to preserve the status code
      } else {
        handleUnexpectedError(error);
      }
    }
  }
}
