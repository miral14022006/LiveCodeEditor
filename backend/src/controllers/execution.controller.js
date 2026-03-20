// ============================================================
//  EXECUTION CONTROLLER
//  API layer for the Unified Code Execution Engine
// ============================================================

import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import {
    runCode as executeCode,
    SUPPORTED_LANGUAGES,
    getLanguageDetails,
    checkDockerAvailable,
} from "../services/executor.service.js"
import { logActivity } from "./activity.controller.js"


// ═══════════════════════════════════════════════════════════
//  POST /execute/run — Execute code in a Docker container
// ═══════════════════════════════════════════════════════════

const runCode = asyncHandler(async (req, res) => {

    const { code, language, input, projectId } = req.body

    // ─── Validation ───────────────────────────────────────────

    if (!code || !code.trim()) {
        throw new ApiError(400, "Code is required")
    }

    if (!language) {
        throw new ApiError(400, "Language is required")
    }

    const lang = language.toLowerCase().trim()

    if (!SUPPORTED_LANGUAGES.includes(lang)) {
        throw new ApiError(
            400,
            `Unsupported language: "${language}". Supported: ${SUPPORTED_LANGUAGES.join(", ")}`
        )
    }

    if (code.length > 100 * 1024) {
        throw new ApiError(400, "Code exceeds maximum allowed size of 100KB")
    }

    // ─── Execute via the unified engine ───────────────────────

    const result = await executeCode({ language: lang, code, input: input || "" })

    // ─── Log activity if projectId is provided ────────────────

    if (projectId) {
        try {
            await logActivity({
                userId: req.user._id,
                projectId,
                action: `${req.user.name} executed ${result.language} code`,
                actionType: "code_executed",
                targetType: "project",
                targetId: projectId,
                metadata: {
                    language: result.language,
                    success: result.success,
                    executionTime: result.executionTime,
                    hasError: !!result.error,
                },
            })
        } catch (err) {
            // Don't fail execution because activity logging failed
            console.error("[Execution] Activity log failed:", err.message)
        }
    }

    // ─── Return response ──────────────────────────────────────

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                success: result.success,
                output: result.output,
                error: result.error,
                executionTime: result.executionTime,
                language: result.language,
                ...(result.previewHtml ? { previewHtml: result.previewHtml } : {}),
            },
            result.success
                ? "Code executed successfully"
                : "Code execution completed with errors"
        )
    )
})


// ═══════════════════════════════════════════════════════════
//  POST /execute/preview — HTML/React Preview
// ═══════════════════════════════════════════════════════════

const previewCode = asyncHandler(async (req, res) => {

    const { code, language } = req.body

    if (!code || !code.trim()) {
        throw new ApiError(400, "Code is required for preview")
    }

    const lang = (language || "html").toLowerCase().trim()

    if (!["html", "react"].includes(lang)) {
        throw new ApiError(400, `Preview is only supported for HTML and React. Got: "${language}"`)
    }

    const result = await executeCode({ language: lang, code })

    if (!result.previewHtml) {
        throw new ApiError(500, "Preview generation failed")
    }

    return res.status(200).json(
        new ApiResponse(200, {
            success: true,
            previewHtml: result.previewHtml,
            language: lang,
            executionTime: result.executionTime,
        }, "Preview generated successfully")
    )
})


// ═══════════════════════════════════════════════════════════
//  GET /execute/languages — List all supported languages
// ═══════════════════════════════════════════════════════════

const getSupportedLanguages = asyncHandler(async (req, res) => {

    const languages = getLanguageDetails()

    return res.status(200).json(
        new ApiResponse(200, { languages }, "Supported languages fetched")
    )
})


// ═══════════════════════════════════════════════════════════
//  GET /execute/status — Check if execution engine is ready
// ═══════════════════════════════════════════════════════════

const getExecutionStatus = asyncHandler(async (req, res) => {

    const docker = await checkDockerAvailable()

    return res.status(200).json(
        new ApiResponse(200, {
            dockerAvailable: docker.available,
            dockerVersion: docker.version,
            supportedLanguages: SUPPORTED_LANGUAGES,
            totalLanguages: SUPPORTED_LANGUAGES.length,
            limits: {
                timeout: "5–15 seconds (depends on language)",
                memory: "128–256 MB",
                cpu: "0.5–1.0 cores",
                maxCodeSize: "100 KB",
                maxOutput: "1 MB",
                network: "disabled",
                filesystem: "read-only",
            },
        }, docker.available ? "Execution engine is ready" : "Docker is not available")
    )
})


// ═══════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════

export {
    runCode,
    previewCode,
    getSupportedLanguages,
    getExecutionStatus,
}
