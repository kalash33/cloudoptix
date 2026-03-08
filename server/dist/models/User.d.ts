import { Item } from 'dynamoose/dist/Item';
export interface IUser extends Item {
    id: string;
    email: string;
    password: string;
    name: string;
    company?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const UserModel: import("dynamoose/dist/General").ModelType<IUser>;
export default UserModel;
export declare const comparePassword: (candidatePassword: string, userPassword?: string) => Promise<boolean>;
export declare const hashPassword: (password: string) => Promise<string>;
//# sourceMappingURL=User.d.ts.map