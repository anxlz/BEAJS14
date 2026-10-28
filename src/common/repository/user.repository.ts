import { UserModel } from "../../DB/model/index.js";
import type { IUser } from "../interface/index.js";
import { BaseRepository } from "./base.repository.js";

export class UserRepository extends BaseRepository<IUser> {
    constructor() {
        super(UserModel);
    }
}
