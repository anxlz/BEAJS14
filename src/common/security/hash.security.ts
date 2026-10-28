import bcrypt from "bcrypt";

export const hash = async (plaintext: string, rounds = 12): Promise<string> => {
    return await bcrypt.hash(plaintext, rounds);
};

export const compare = async (plaintext: string, hashed: string): Promise<boolean> => {
    return await bcrypt.compare(plaintext, hashed);
};
