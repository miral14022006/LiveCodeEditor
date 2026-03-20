import { ApiError } from "../utils/ApiError.js"

/**
 * Global error handling middleware
 * Catches all errors and returns consistent JSON responses
 */
const errorHandler = (err, req, res, next) => {

    // Default error values
    let statusCode = 500
    let message = "Internal Server Error"
    let errors = []

    // If it's our custom ApiError
    if (err instanceof ApiError) {
        statusCode = err.statusCode
        message = err.message
        errors = err.errors || []
    }
    // Mongoose validation error
    else if (err.name === "ValidationError") {
        statusCode = 400
        message = "Validation Error"
        errors = Object.values(err.errors).map(e => e.message)
    }
    // Mongoose duplicate key error
    else if (err.code === 11000) {
        statusCode = 409
        const field = Object.keys(err.keyValue)?.[0]
        message = `${field ? field.charAt(0).toUpperCase() + field.slice(1) : 'Field'} already exists`
    }
    // Mongoose cast error (invalid ObjectId)
    else if (err.name === "CastError") {
        statusCode = 400
        message = `Invalid ${err.path}: ${err.value}`
    }
    // JWT errors
    else if (err.name === "JsonWebTokenError") {
        statusCode = 401
        message = "Invalid token"
    }
    else if (err.name === "TokenExpiredError") {
        statusCode = 401
        message = "Token expired"
    }
    // Standard Error
    else if (err.message) {
        message = err.message
    }

    // Log error in development
    if (process.env.NODE_ENV !== "production") {
        console.error("❌ Error:", {
            statusCode,
            message,
            stack: err.stack?.split("\n").slice(0, 3).join("\n"),
        })
    }

    res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        errors,
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
    })
}

export { errorHandler }
