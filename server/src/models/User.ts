import * as dynamoose from 'dynamoose';
import { Item } from 'dynamoose/dist/Item';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface IUser extends Item {
  id: string; // Auto-generated UUID
  email: string;
  password: string;
  name: string;
  company?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => crypto.randomUUID(),
    },
    email: {
      type: String,
      required: true,
      index: {
        name: 'emailIndex',
        type: 'global',
      },
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    company: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// We export the model instance
export const UserModel = dynamoose.model<IUser>('User', userSchema);
export default UserModel;

// Utility functions extracted since Dynamoose doesn't support Schema method bindings the same way Mongoose does
export const comparePassword = async function (
  candidatePassword: string,
  userPassword?: string
): Promise<boolean> {
  if (!userPassword) return false;
  return bcrypt.compare(candidatePassword, userPassword);
};

export const hashPassword = async function (password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};
