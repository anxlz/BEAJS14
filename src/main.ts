import cors from "cors";
import express from "express";
import { PORT } from "./config.js";
import { connectDB, connectRedis } from "./DB/connection.db.js";
import { globalErrorHandling } from "./middleware/index.js";
import { authenticationController, userController } from "./modules/index.js";

const bootstrap = async (): Promise<void> => {
    const app = express();

    app.use(cors());
    app.use(express.json());

    app.get("/", (req, res) => {
        res.status(200).json({ message: "Welcome to Social App", status: 200 });
    });

    app.use("/auth", authenticationController);
    app.use("/user", userController);

    app.all("{/*dummy}", (req, res) => {
        res.status(404).json({ message: "Invalid application routing", status: 404 });
    });

    app.use(globalErrorHandling);

    await connectDB();
    await connectRedis();

    app.listen(PORT, () => {
        console.log(`Social App listening on port ${PORT}!`);
    });
};

bootstrap().catch((error) => {
    console.log("Fail to start the application", error);
    process.exit(1);
});
