import type { HydratedDocument, Model } from "mongoose";
import type { RawDocument } from "../interface/index.js";

export type FilterInput = Record<string, any>;
export type UpdateInput = Record<string, any>;
export type ProjectionInput = string | Record<string, 0 | 1>;

export interface FindOptions {
    lean?: boolean;
    sort?: Record<string, 1 | -1>;
    skip?: number;
    limit?: number;
}

export class BaseRepository<T> {
    constructor(protected readonly model: Model<T>) {}

    // Loose Types Inside
    private get db(): any {
        return this.model;
    }

    private async run(query: any, options: FindOptions): Promise<any> {
        if (options.sort) query = query.sort(options.sort);
        if (options.skip) query = query.skip(options.skip);
        if (options.limit) query = query.limit(options.limit);
        if (options.lean) query = query.lean();
        return await query.exec();
    }

    async create(data: Partial<T>) {
        const document = new this.model(data);
        await document.save();
        return document;
    }

    // Hydrated Document
    findOne(filter: FilterInput, projection?: ProjectionInput, options?: FindOptions & { lean?: false }): Promise<HydratedDocument<T> | null>;
    // Raw Document
    findOne(filter: FilterInput, projection: ProjectionInput | undefined, options: FindOptions & { lean: true }): Promise<RawDocument<T> | null>;
    async findOne(filter: FilterInput, projection?: ProjectionInput, options: FindOptions = {}): Promise<unknown> {
        return await this.run(this.db.findOne(filter, projection), options);
    }

    findById(id: unknown, projection?: ProjectionInput, options?: FindOptions & { lean?: false }): Promise<HydratedDocument<T> | null>;
    findById(id: unknown, projection: ProjectionInput | undefined, options: FindOptions & { lean: true }): Promise<RawDocument<T> | null>;
    async findById(id: unknown, projection?: ProjectionInput, options: FindOptions = {}): Promise<unknown> {
        return await this.run(this.db.findById(id, projection), options);
    }

    find(filter?: FilterInput, projection?: ProjectionInput, options?: FindOptions & { lean?: false }): Promise<HydratedDocument<T>[]>;
    find(filter: FilterInput | undefined, projection: ProjectionInput | undefined, options: FindOptions & { lean: true }): Promise<RawDocument<T>[]>;
    async find(filter: FilterInput = {}, projection?: ProjectionInput, options: FindOptions = {}): Promise<unknown> {
        return await this.run(this.db.find(filter, projection), options);
    }

    async updateOne(filter: FilterInput, update: UpdateInput) {
        return await this.db.updateOne(filter, update).exec();
    }

    async updateMany(filter: FilterInput, update: UpdateInput) {
        return await this.db.updateMany(filter, update).exec();
    }

    async deleteOne(filter: FilterInput) {
        return await this.db.deleteOne(filter).exec();
    }

    async countDocuments(filter: FilterInput = {}): Promise<number> {
        return await this.db.countDocuments(filter).exec();
    }
}
