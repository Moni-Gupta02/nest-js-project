import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserDocument } from './Schemas/auth.schema';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { UpdateUserDto } from './dto/update-user.dto';
import { message } from 'src/common/assets';
import { UserListFilterDto } from './dto/user-list.dto';
import { Types } from 'mongoose';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('userKMS')
    private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}
  // async validateUser(user: User): Promise<UserDocument> {
  //   // Implement user validation logic (e.g., fetch user from database)
  //   // Example: Fetch user by ID or username from database and return with role
  //   const fetchedUser: User = { ...user, role: 'admin' }; // Replace with actual user fetching logic
  //   return fetchedUser;
  // }

  // async login(user: User): Promise<UserDocument> {
  //   try {
  //     const payload: JwtPayload = { sub: user.id, username: user.username };
  //     return this.jwtService.sign(payload);
  //   } catch (err) {
  //     throw new BadRequestException(err);
  //   }
  // }
  // async validateUser(username: string, pass: string): Promise<UserDocument> {
  //   const user = await this.userModel.findOne({ username: username });
  //   if (user && user.password === pass) {
  //     // Add proper password hashing and comparison
  //     // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //     const { password, ...result } = user;
  //     return result;
  //   }
  //   return null;
  // }

  async validateUser(email: string, password: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email }).exec();

    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async login(email: string, password: string) {
    const user = await this.userModel.findOne({ email: email });
    console.log('user', user);
    if (!user) {
      return message.auth.INVALID_CREDENTIALS;
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return message.auth.INVALID_CREDENTIALS;
    }
    const userWithoutSensitiveInfo = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      // Add any other fields you need to include
    };

    const payload = {
      _id: user._id,
      name: user.name,
      role: user.role,
      email: user.email,
      // password: user.password,
    };
    return {
      user_details: userWithoutSensitiveInfo,
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async register(
    email: string,
    password: string,
    role: string,
    name: string,
    permissions: any,
  ): Promise<UserDocument> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      throw new HttpException(
        { message: 'Email Already Exist', status: false },
        HttpStatus.BAD_REQUEST,
      );
    }
    const newUser = new this.userModel({
      email,
      password: hashedPassword,
      role,
      name,
      permissions,
    });
    return newUser.save();
  }

  async updateUser(
    userId: string,
    updateData: UpdateUserDto,
  ): Promise<UserDocument> {
    if (updateData.password && updateData.password.trim().length > 0) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    } else {
      // Remove password from updateData if it is empty, null, undefined, or blank
      delete updateData.password;
    }
    return this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .exec();
  }

  async getUserProfile(userId: string): Promise<UserDocument> {
    console.log(userId);
    if (!Types.ObjectId.isValid(userId)) {
      throw new HttpException(
        { message: 'User is not avalible', status: false },
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.userModel.findById(userId).exec();
    console.log(result, '------');
    return result;
  }

  async listUsers(query: UserListFilterDto): Promise<any> {
    const { search, page = 1, limit = 10, sort = 'createdAt', order } = query;

    let filter = {};
    if (search) {
      filter = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      };
    }
    const sortOrder = order ? (order == 1 ? 1 : -1) : -1;
    const [users, totalUsers] = await Promise.all([
      await this.userModel
        .find(filter, { password: 0, updatedAt: 0 })
        .sort({ [sort]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      await this.userModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(totalUsers / limit);
    console.log(users);
    return {
      users,
      totalUsers,
      totalPages,
      currentPage: +page,
    };
  }

  async deleteUser(userId: string): Promise<{ deleted: boolean }> {
    const result = await this.userModel.findByIdAndDelete(userId).exec();
    return { deleted: !!result };
  }

  async findRoleByName(user_id: string): Promise<UserDocument> {
    return this.userModel.findById(user_id).exec();
  }
  async getUserData(userId: string): Promise<any> {
    const result = await this.userModel
      .findById(userId)
      .select('-password -createdAt -updatedAt')
      .exec();
    return result;
  }
}
