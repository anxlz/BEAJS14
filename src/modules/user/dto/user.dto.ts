import { z } from "zod";
import type { FollowStatusEnum } from "../../../common/enum/index.js";
import * as validators from "../user.validation.js";

export type UpdateProfileDto = z.infer<typeof validators.updateProfile>["body"];
export type SearchUsersDto = z.infer<typeof validators.searchUsers>["query"];
export type SuggestionsDto = z.infer<typeof validators.suggestions>["query"];
export type ListConnectionsDto = z.infer<typeof validators.listConnections>["query"];
export type RespondFollowRequestDto = z.infer<typeof validators.respondFollowRequest>["body"];
export type UpdateSettingsDto = z.infer<typeof validators.updateSettings>["body"];
export type ChangePasswordDto = z.infer<typeof validators.changePassword>["body"];

export interface IBasicUser {
    id: string;
    username: string;
    image: string | null;
    isPrivate: boolean;
    followersCount: number;
    followingCount: number;
    followStatus?: FollowStatusEnum;
}

export interface IPaginated<T> {
    total: number;
    page: number;
    limit: number;
    items: T[];
}
