import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Generate Access Token
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            _id: user._id,
            email: user.email,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: "15m",
        }
    );
};

// Generate Refresh Token
const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            _id: user._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: "7d",
        }
    );
};

export const register = asyncHandler(async (req, res) => {

    const { name, email, password, username } = req.body;

    if (!name || !email || !password || !username) {
        throw new Error("All fields are required");
    }

    const existingUser = await User.findOne({
        $or: [{ email }, { username }]
    });

    if (existingUser) {
        throw new Error("User with this email or username already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        name,
        email,
        username: username.toLowerCase(),
        password: hashedPassword,
    });

    res.status(201).json({
        message: "User registered successfully",
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            username: user.username
        },
    });
});

export const login = asyncHandler(async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        throw new Error("All fields are required");
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        throw new Error("Invalid credentials");
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(200).json({
        message: "Login successful",
        accessToken,
        refreshToken,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
        },
    });
});

export const refreshAccessToken = asyncHandler(async (req, res) => {

    const { refreshToken } = req.body;

    if (!refreshToken) {
        throw new Error("Refresh token required");
    }

    try {
        const decoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decoded._id);

        if (!user) {
            throw new Error("Invalid refresh token");
        }

        const newAccessToken = generateAccessToken(user);

        res.status(200).json({
            accessToken: newAccessToken,
        });
    } catch (error) {
        console.error("Refresh Token Error:", error.message);
        if (error.name === "TokenExpiredError") {
            throw new Error("Refresh token expired");
        }
        if (error.name === "JsonWebTokenError") {
            throw new Error("Invalid refresh token (verification failed)");
        }
        throw new Error(error.message || "Invalid or expired refresh token");
    }
});

export const logout = asyncHandler(async (req, res) => {
    res.status(200).json({
        message: "Logged out successfully",
    });
});
