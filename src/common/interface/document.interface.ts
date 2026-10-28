import type { Types } from "mongoose";

// Raw Document (lean)
export type RawDocument<T> = T & { _id: Types.ObjectId };
