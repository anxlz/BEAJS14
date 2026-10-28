import { FollowActionEnum, FollowStatusEnum, ProviderEnum } from "../../common/enum/index.js";
import {
    BadRequestException,
    ConflictException,
    NotFoundException
} from "../../common/exception/index.js";
import type { IUser, RawDocument } from "../../common/interface/index.js";
import { UserRepository } from "../../common/repository/index.js";
import { compare, decryption, encryption, hash } from "../../common/security/index.js";
import type {
    ChangePasswordDto,
    IBasicUser,
    IPaginated,
    ListConnectionsDto,
    RespondFollowRequestDto,
    SearchUsersDto,
    SuggestionsDto,
    UpdateProfileDto,
    UpdateSettingsDto
} from "./dto/index.js";

type Connection = "followers" | "following" | "followRequests";

const BASIC_FIELDS = "firstName lastName image isPrivate followers following followRequests confirmEmail";

const hasId = (list: unknown[] | undefined, id: string): boolean => (list ?? []).some((item) => String(item) === id);
const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const nameRegex = (text: string) => ({ $regex: escapeRegex(text), $options: "i" });

export class UserService {
    constructor(private readonly userRepository: UserRepository = new UserRepository()) {}

    private followStatusOf(user: RawDocument<IUser>, viewerId: string): FollowStatusEnum {
        if (String(user._id) === viewerId) return FollowStatusEnum.SELF;
        if (hasId(user.followers, viewerId)) return FollowStatusEnum.FOLLOWING;
        if (hasId(user.followRequests, viewerId)) return FollowStatusEnum.PENDING;
        return FollowStatusEnum.NONE;
    }

    private toBasicUser(user: RawDocument<IUser>, viewerId?: string): IBasicUser {
        return {
            id: String(user._id),
            username: `${user.firstName} ${user.lastName}`,
            image: user.image ?? null,
            isPrivate: user.isPrivate,
            followersCount: user.followers?.length ?? 0,
            followingCount: user.following?.length ?? 0,
            ...(viewerId ? { followStatus: this.followStatusOf(user, viewerId) } : {})
        };
    }

    // ---------- 1. Profile retrieval and updates ----------
    async getProfile(userId: string) {
        const user = await this.userRepository.findById(userId, undefined, { lean: true });
        if (!user) {
            throw new NotFoundException("User not found");
        }
        return {
            ...this.toBasicUser(user),
            email: user.email,
            phone: user.phone ? await decryption(user.phone) : null,
            bio: user.bio ?? null,
            gender: user.gender,
            followRequestsCount: user.followRequests?.length ?? 0,
            createdAt: user.createdAt
        };
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        const update: Record<string, unknown> = {};
        if (dto.username) {
            const [firstName, lastName] = dto.username.split(" ");
            update.firstName = firstName;
            update.lastName = lastName;
        }
        if (dto.phone) update.phone = await encryption(dto.phone);
        if (dto.bio !== undefined) update.bio = dto.bio;
        if (dto.gender !== undefined) update.gender = dto.gender;

        await this.userRepository.updateOne({ _id: userId }, { $set: update });
        return await this.getProfile(userId);
    }

    // Other people's profiles respect the privacy setting
    async getUserProfile(viewerId: string, targetId: string) {
        if (viewerId === targetId) {
            return { ...(await this.getProfile(viewerId)), followStatus: FollowStatusEnum.SELF };
        }

        const target = await this.userRepository.findById(targetId, undefined, { lean: true });
        if (!target || !target.confirmEmail) {
            throw new NotFoundException("User not found");
        }

        const basic = this.toBasicUser(target, viewerId);
        if (target.isPrivate && basic.followStatus !== FollowStatusEnum.FOLLOWING) {
            return basic;
        }
        return { ...basic, bio: target.bio ?? null, gender: target.gender };
    }

    // ---------- 2. Follow / Unfollow ----------
    async follow(viewerId: string, targetId: string) {
        if (viewerId === targetId) {
            throw new BadRequestException("You cannot follow yourself");
        }
        const target = await this.userRepository.findById(targetId, "isPrivate followers followRequests confirmEmail", { lean: true });
        if (!target || !target.confirmEmail) {
            throw new NotFoundException("User not found");
        }
        if (hasId(target.followers, viewerId)) {
            throw new ConflictException("You already follow this user");
        }
        if (hasId(target.followRequests, viewerId)) {
            throw new ConflictException("Follow request already sent");
        }

        if (target.isPrivate) {
            await this.userRepository.updateOne({ _id: targetId }, { $addToSet: { followRequests: viewerId } });
            return { status: FollowStatusEnum.PENDING };
        }

        await Promise.all([
            this.userRepository.updateOne({ _id: targetId }, { $addToSet: { followers: viewerId } }),
            this.userRepository.updateOne({ _id: viewerId }, { $addToSet: { following: targetId } })
        ]);
        return { status: FollowStatusEnum.FOLLOWING };
    }

    async unfollow(viewerId: string, targetId: string) {
        const target = await this.userRepository.findById(targetId, "followers followRequests", { lean: true });
        if (!target) {
            throw new NotFoundException("User not found");
        }

        if (hasId(target.followers, viewerId)) {
            await Promise.all([
                this.userRepository.updateOne({ _id: targetId }, { $pull: { followers: viewerId } }),
                this.userRepository.updateOne({ _id: viewerId }, { $pull: { following: targetId } })
            ]);
            return { status: FollowStatusEnum.NONE };
        }

        // Cancel a pending request
        if (hasId(target.followRequests, viewerId)) {
            await this.userRepository.updateOne({ _id: targetId }, { $pull: { followRequests: viewerId } });
            return { status: FollowStatusEnum.NONE };
        }

        throw new ConflictException("You do not follow this user");
    }

    async respondToFollowRequest(ownerId: string, requesterId: string, dto: RespondFollowRequestDto) {
        const owner = await this.userRepository.findById(ownerId, "followRequests", { lean: true });
        if (!owner || !hasId(owner.followRequests, requesterId)) {
            throw new NotFoundException("Follow request not found");
        }

        await this.userRepository.updateOne({ _id: ownerId }, { $pull: { followRequests: requesterId } });
        if (dto.action === FollowActionEnum.ACCEPT) {
            await Promise.all([
                this.userRepository.updateOne({ _id: ownerId }, { $addToSet: { followers: requesterId } }),
                this.userRepository.updateOne({ _id: requesterId }, { $addToSet: { following: ownerId } })
            ]);
        }
        return { action: dto.action };
    }

    async listConnections(userId: string, connection: Connection, dto: ListConnectionsDto): Promise<IPaginated<IBasicUser>> {
        const owner = await this.userRepository.findById(userId, connection, { lean: true });
        if (!owner) {
            throw new NotFoundException("User not found");
        }

        const ids = owner[connection] ?? [];
        const pageIds = ids.slice((dto.page - 1) * dto.limit, dto.page * dto.limit);
        const users = await this.userRepository.find({ _id: { $in: pageIds } }, BASIC_FIELDS, { lean: true });
        return {
            total: ids.length,
            page: dto.page,
            limit: dto.limit,
            items: users.map((user) => this.toBasicUser(user, userId))
        };
    }

    // ---------- 3. Search and suggestions ----------
    async search(viewerId: string, dto: SearchUsersDto): Promise<IPaginated<IBasicUser>> {
        const words = dto.q.split(/\s+/).filter(Boolean);
        const first = words[0] as string;
        const nameFilter =
            words.length > 1
                ? { firstName: nameRegex(first), lastName: nameRegex(words[1] as string) }
                : { $or: [{ firstName: nameRegex(first) }, { lastName: nameRegex(first) }] };

        const filter = { _id: { $ne: viewerId }, confirmEmail: { $ne: null }, ...nameFilter };
        const [total, users] = await Promise.all([
            this.userRepository.countDocuments(filter),
            this.userRepository.find(filter, BASIC_FIELDS, {
                lean: true,
                sort: { firstName: 1, lastName: 1 },
                skip: (dto.page - 1) * dto.limit,
                limit: dto.limit
            })
        ]);

        return {
            total,
            page: dto.page,
            limit: dto.limit,
            items: users.map((user) => this.toBasicUser(user, viewerId))
        };
    }

    // People followed by the people you follow come first, then newest users
    async suggestions(viewerId: string, dto: SuggestionsDto) {
        const me = await this.userRepository.findById(viewerId, "following followRequests", { lean: true });
        if (!me) {
            throw new NotFoundException("User not found");
        }

        const followingIds = (me.following ?? []).map(String);
        const excluded = new Set<string>([viewerId, ...followingIds]);

        const mutuals = new Map<string, number>();
        if (followingIds.length) {
            const friends = await this.userRepository.find({ _id: { $in: followingIds } }, "following", { lean: true });
            for (const friend of friends) {
                for (const id of (friend.following ?? []).map(String)) {
                    if (!excluded.has(id)) {
                        mutuals.set(id, (mutuals.get(id) ?? 0) + 1);
                    }
                }
            }
        }

        const rankedIds = [...mutuals.entries()].sort((a, b) => b[1] - a[1]).slice(0, dto.limit).map(([id]) => id);
        const ranked = rankedIds.length
            ? await this.userRepository.find({ _id: { $in: rankedIds }, confirmEmail: { $ne: null } }, BASIC_FIELDS, { lean: true })
            : [];
        ranked.sort((a, b) => (mutuals.get(String(b._id)) ?? 0) - (mutuals.get(String(a._id)) ?? 0));

        const suggestions = ranked.map((user) => ({
            ...this.toBasicUser(user, viewerId),
            mutualConnections: mutuals.get(String(user._id)) ?? 0
        }));

        if (suggestions.length < dto.limit) {
            const taken = [...excluded, ...suggestions.map((user) => user.id)];
            const newest = await this.userRepository.find(
                { _id: { $nin: taken }, confirmEmail: { $ne: null } },
                BASIC_FIELDS,
                { lean: true, sort: { createdAt: -1 }, limit: dto.limit - suggestions.length }
            );
            suggestions.push(...newest.map((user) => ({ ...this.toBasicUser(user, viewerId), mutualConnections: 0 })));
        }

        return suggestions;
    }

    // ---------- 4. Account settings and privacy ----------
    async getSettings(userId: string) {
        const user = await this.userRepository.findById(userId, "isPrivate", { lean: true });
        if (!user) {
            throw new NotFoundException("User not found");
        }
        return { isPrivate: user.isPrivate };
    }

    async updateSettings(userId: string, dto: UpdateSettingsDto) {
        const user = await this.userRepository.findById(userId, "isPrivate followRequests", { lean: true });
        if (!user) {
            throw new NotFoundException("User not found");
        }

        await this.userRepository.updateOne({ _id: userId }, { $set: { isPrivate: dto.isPrivate } });

        // A public profile has nothing to approve: pending requests become followers
        const pending = (user.followRequests ?? []).map(String);
        if (!dto.isPrivate && pending.length) {
            await Promise.all([
                this.userRepository.updateOne(
                    { _id: userId },
                    { $addToSet: { followers: { $each: pending } }, $set: { followRequests: [] } }
                ),
                this.userRepository.updateMany({ _id: { $in: pending } }, { $addToSet: { following: userId } })
            ]);
        }
        return { isPrivate: dto.isPrivate };
    }

    async changePassword(userId: string, dto: ChangePasswordDto) {
        const user = await this.userRepository.findById(userId, "+password provider", { lean: true });
        if (!user) {
            throw new NotFoundException("User not found");
        }
        if (user.provider !== ProviderEnum.SYSTEM || !user.password) {
            throw new BadRequestException("This account does not use a password");
        }
        if (!(await compare(dto.oldPassword, user.password))) {
            throw new BadRequestException("Old password is incorrect");
        }

        // Every old token stops working
        await this.userRepository.updateOne(
            { _id: userId },
            { $set: { password: await hash(dto.password), changeCredentialsTime: new Date() } }
        );
        return { changed: true };
    }
}

export const userService = new UserService();
