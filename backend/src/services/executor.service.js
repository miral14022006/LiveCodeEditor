// ============================================================
//  UNIFIED CODE EXECUTION ENGINE — executor.service.js
//  Single entry point for ALL language execution
// ============================================================
//
//  ALL runtimes are installed in ONE container (see Dockerfile).
//  Code executes as sandboxed child processes — no Docker-in-Docker.
//
//  Supported Languages:
//    1. JavaScript  (Node.js 18)
//    2. Python      (Python 3)
//    3. C           (gcc)
//    4. C++         (g++)
//    5. Java        (OpenJDK 17)
//    6. TypeScript  (npx tsx via Node.js 18)
//    7. Node.js     (backend apps — Express, etc.)
//    8. HTML/CSS/JS (browser preview — returns rendered HTML)
//    9. React       (JSX preview — returns rendered HTML via Babel CDN)
//
// ============================================================

import { exec, execSync } from "child_process"
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"

// ══════════════════════════════════════════════════════════════
//  LANGUAGE CONFIGURATION — every language in ONE unified map
// ══════════════════════════════════════════════════════════════

const LANGUAGE_CONFIG = {

    // ─── Interpreted Languages ────────────────────────────────

    javascript: {
        filename: "code.js",
        buildCmd: null,
        runCmd: (dir) => `node ${join(dir, "code.js")}`,
        timeout: 5000,
        category: "interpreted",
        extension: ".js",
        displayName: "JavaScript",
    },

    python: {
        filename: "code.py",
        buildCmd: null,
        runCmd: (dir) => `python3 ${join(dir, "code.py")}`,
        timeout: 5000,
        category: "interpreted",
        extension: ".py",
        displayName: "Python",
    },

    typescript: {
        filename: "code.ts",
        buildCmd: null,
        runCmd: (dir) => `npx --yes tsx ${join(dir, "code.ts")}`,
        timeout: 15000, // extra time for tsx install on first run
        category: "interpreted",
        extension: ".ts",
        displayName: "TypeScript",
    },

    // ─── Compiled Languages ───────────────────────────────────

    c: {
        filename: "code.c",
        buildCmd: (dir) => `gcc -o ${join(dir, "program")} ${join(dir, "code.c")} -lm`,
        runCmd: (dir) => join(dir, "program"),
        timeout: 10000,
        category: "compiled",
        extension: ".c",
        displayName: "C",
    },

    cpp: {
        filename: "code.cpp",
        buildCmd: (dir) => `g++ -o ${join(dir, "program")} ${join(dir, "code.cpp")} -lm -lstdc++`,
        runCmd: (dir) => join(dir, "program"),
        timeout: 10000,
        category: "compiled",
        extension: ".cpp",
        displayName: "C++",
    },

    java: {
        filename: "Main.java",
        buildCmd: (dir) => `javac ${join(dir, "Main.java")}`,
        runCmd: (dir) => `java -cp ${dir} Main`,
        timeout: 15000,
        category: "compiled",
        extension: ".java",
        displayName: "Java",
    },

    // ─── Preview Languages (return rendered HTML — no process needed) ──

    html: {
        filename: "index.html",
        buildCmd: null,
        runCmd: null,
        timeout: 2000,
        category: "preview",
        extension: ".html",
        displayName: "HTML/CSS/JS",
    },

    react: {
        filename: "App.jsx",
        buildCmd: null,
        runCmd: null,
        timeout: 5000,
        category: "preview",
        extension: ".jsx",
        displayName: "React",
    },

    // ─── Server Apps ──────────────────────────────────────────

    nodejs: {
        filename: "server.js",
        buildCmd: null,
        runCmd: (dir) => `node ${join(dir, "server.js")}`,
        timeout: 8000,
        category: "server",
        extension: ".js",
        displayName: "Node.js App",
    },
}

// ══════════════════════════════════════════════════════════════
//  PUBLIC API — everything flows through this ONE function
// ══════════════════════════════════════════════════════════════

/**
 * Unified code execution engine — single entry point for ALL languages
 *
 * @param {Object}  params
 * @param {string}  params.language   - Language key (e.g. "javascript", "cpp", "react")
 * @param {string}  params.code       - Source code to execute
 * @param {string}  [params.input=""] - Optional stdin input
 * @returns {Promise<{ success: boolean, output: string, error: string|null, executionTime: number, language: string, previewHtml?: string }>}
 */
export async function runCode({ language, code, input = "" }) {
    const startTime = Date.now()

    // ─── 1. Validate language ─────────────────────────────────
    const lang = language?.toLowerCase().trim()
    const config = LANGUAGE_CONFIG[lang]

    if (!config) {
        return buildResult({
            success: false,
            output: "",
            error: `Unsupported language: "${language}". Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
            executionTime: Date.now() - startTime,
            language: lang,
        })
    }

    // ─── 2. Validate code ─────────────────────────────────────
    if (!code || !code.trim()) {
        return buildResult({
            success: false,
            output: "",
            error: "No code provided",
            executionTime: Date.now() - startTime,
            language: lang,
        })
    }

    // ─── 3. Security: limit code size (max 100KB) ─────────────
    if (code.length > 100 * 1024) {
        return buildResult({
            success: false,
            output: "",
            error: "Code exceeds maximum allowed size of 100KB",
            executionTime: Date.now() - startTime,
            language: lang,
        })
    }

    // ─── 4. Route to the correct execution strategy ───────────
    try {
        switch (config.category) {
            case "interpreted":
            case "server":
                return await executeProcess({ lang, config, code, input, startTime })

            case "compiled":
                return await compileAndExecute({ lang, config, code, input, startTime })

            case "preview":
                return handlePreview({ lang, code, startTime })

            default:
                return buildResult({
                    success: false,
                    output: "",
                    error: `Unknown category "${config.category}" for language "${lang}"`,
                    executionTime: Date.now() - startTime,
                    language: lang,
                })
        }
    } catch (err) {
        return buildResult({
            success: false,
            output: "",
            error: `Execution engine error: ${err.message}`,
            executionTime: Date.now() - startTime,
            language: lang,
        })
    }
}

// ══════════════════════════════════════════════════════════════
//  EXECUTE — Interpreted & Server Languages (JS, Python, TS, Node.js)
// ══════════════════════════════════════════════════════════════

async function executeProcess({ lang, config, code, input, startTime }) {
    const executionId = uuidv4()
    const tmpDir = join("/tmp", "code-execution", executionId)

    try {
        // Create temp directory and write code file
        mkdirSync(tmpDir, { recursive: true })
        writeFileSync(join(tmpDir, config.filename), code)

        // Build run command
        const cmd = config.runCmd(tmpDir)

        // Execute with optional stdin input
        const result = await execPromise(cmd, config.timeout, input)

        return buildResult({
            success: result.exitCode === 0,
            output: result.stdout,
            error: result.stderr || null,
            executionTime: Date.now() - startTime,
            language: lang,
        })

    } finally {
        cleanup(tmpDir)
    }
}

// ══════════════════════════════════════════════════════════════
//  COMPILE + EXECUTE — Compiled Languages (C, C++, Java)
// ══════════════════════════════════════════════════════════════

async function compileAndExecute({ lang, config, code, input, startTime }) {
    const executionId = uuidv4()
    const tmpDir = join("/tmp", "code-execution", executionId)

    try {
        // Create temp directory and write code file
        mkdirSync(tmpDir, { recursive: true })
        writeFileSync(join(tmpDir, config.filename), code)

        // ─── Step 1: Compile ──────────────────────────────────
        const compileCmd = config.buildCmd(tmpDir)
        const compileResult = await execPromise(compileCmd, config.timeout)

        if (compileResult.exitCode !== 0) {
            return buildResult({
                success: false,
                output: compileResult.stdout,
                error: `Compilation Error:\n${compileResult.stderr}`,
                executionTime: Date.now() - startTime,
                language: lang,
            })
        }

        // ─── Step 2: Run ──────────────────────────────────────
        const runCmd = config.runCmd(tmpDir)
        const runResult = await execPromise(runCmd, config.timeout, input)

        return buildResult({
            success: runResult.exitCode === 0,
            output: runResult.stdout,
            error: runResult.stderr || null,
            executionTime: Date.now() - startTime,
            language: lang,
        })

    } finally {
        cleanup(tmpDir)
    }
}

// ══════════════════════════════════════════════════════════════
//  PREVIEW — HTML/CSS/JS & React (No process execution needed)
// ══════════════════════════════════════════════════════════════

function handlePreview({ lang, code, startTime }) {

    if (lang === "html") {
        const sanitizedHtml = sanitizeHtml(code)
        return buildResult({
            success: true,
            output: "HTML preview generated successfully",
            error: null,
            executionTime: Date.now() - startTime,
            language: lang,
            previewHtml: sanitizedHtml,
        })
    }

    if (lang === "react") {
        const reactPreview = buildReactPreview(code)
        return buildResult({
            success: true,
            output: "React preview generated successfully",
            error: null,
            executionTime: Date.now() - startTime,
            language: lang,
            previewHtml: reactPreview,
        })
    }

    return buildResult({
        success: false,
        output: "",
        error: `Preview not supported for language: ${lang}`,
        executionTime: Date.now() - startTime,
        language: lang,
    })
}

// ══════════════════════════════════════════════════════════════
//  EXEC PROMISE — Wraps child_process.exec in a Promise
// ══════════════════════════════════════════════════════════════

function execPromise(command, timeout, stdinInput = "") {
    return new Promise((resolve) => {
        const child = exec(command, {
            timeout: timeout + 2000,    // Small buffer over the language timeout
            maxBuffer: 1024 * 1024,     // 1MB max stdout/stderr
            encoding: "utf-8",
            env: {
                ...process.env,
                // Prevent user code from accessing secrets
                ACCESS_TOKEN_SECRET: undefined,
                REFRESH_TOKEN_SECRET: undefined,
                MONGODB_URI: undefined,
            },
        }, (error, stdout, stderr) => {

            // Timeout — process was killed
            if (error && error.killed) {
                return resolve({
                    stdout: stdout || "",
                    stderr: "⏱ Execution timed out. Your code took too long to run.",
                    exitCode: 124,
                })
            }

            // Out of memory — OOM kill (exit code 137)
            if (error && (error.code === 137 || error.signal === "SIGKILL")) {
                return resolve({
                    stdout: stdout || "",
                    stderr: "💾 Memory limit exceeded. Your code used too much memory.",
                    exitCode: 137,
                })
            }

            resolve({
                stdout: trimOutput(stdout || ""),
                stderr: trimOutput(stderr || ""),
                exitCode: error ? (error.code || 1) : 0,
            })
        })

        // Pipe stdin input if provided and close stream
        if (child.stdin) {
            if (stdinInput) {
                // Ensure a newline is present at the end for line-buffered inputs
                const inputWithNewline = stdinInput.endsWith('\n') ? stdinInput : stdinInput + '\n';
                child.stdin.write(inputWithNewline);
            }
            child.stdin.end();
        }
    })
}

// ══════════════════════════════════════════════════════════════
//  HTML PREVIEW HELPERS
// ══════════════════════════════════════════════════════════════

function sanitizeHtml(code) {
    if (!code.toLowerCase().includes("<!doctype") && !code.toLowerCase().includes("<html")) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
</head>
<body>
${code}
</body>
</html>`
    }
    return code
}

function buildReactPreview(jsxCode) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Preview</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        #root { min-height: 100vh; }
        .error-overlay {
            position: fixed; top: 0; left: 0; right: 0;
            background: #ff000015; color: #cc0000; padding: 12px 16px;
            font-family: monospace; font-size: 13px; border-bottom: 2px solid #cc0000;
            white-space: pre-wrap; z-index: 9999;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel" data-type="module">
        try {
            ${jsxCode}

            const ComponentToRender = typeof App !== 'undefined' ? App
                : typeof Main !== 'undefined' ? Main
                : typeof Component !== 'undefined' ? Component
                : null;

            if (ComponentToRender) {
                const root = ReactDOM.createRoot(document.getElementById('root'));
                root.render(React.createElement(ComponentToRender));
            } else {
                document.getElementById('root').innerHTML =
                    '<p style="padding:20px;color:#666;">Define an <code>App</code>, <code>Main</code>, or <code>Component</code> function to see the preview.</p>';
            }
        } catch (err) {
            const overlay = document.createElement('div');
            overlay.className = 'error-overlay';
            overlay.textContent = 'React Error: ' + err.message;
            document.body.prepend(overlay);
            console.error(err);
        }
    </script>
</body>
</html>`
}

// ══════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════

function buildResult({ success, output, error, executionTime, language, previewHtml }) {
    const result = {
        success,
        output: output || "",
        error: error || null,
        executionTime: executionTime || 0,
        language: language || "unknown",
    }
    if (previewHtml !== undefined) {
        result.previewHtml = previewHtml
    }
    return result
}

function trimOutput(output, maxLength = 50000) {
    if (output.length > maxLength) {
        return output.slice(0, maxLength) + "\n\n... [Output truncated — exceeded 50KB]"
    }
    return output
}

function cleanup(tmpDir) {
    try {
        if (existsSync(tmpDir)) {
            rmSync(tmpDir, { recursive: true, force: true })
        }
    } catch (err) {
        console.error(`[Executor] Cleanup failed for ${tmpDir}:`, err.message)
    }
}

// ══════════════════════════════════════════════════════════════
//  EXPORTS — Public helpers used by controller
// ══════════════════════════════════════════════════════════════

/** All supported language keys */
export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_CONFIG)

/** Get detailed language config for the /languages endpoint */
export function getLanguageDetails() {
    return Object.entries(LANGUAGE_CONFIG).map(([key, cfg]) => ({
        id: key,
        name: cfg.displayName,
        extension: cfg.extension,
        category: cfg.category,
        timeout: `${cfg.timeout / 1000}s`,
    }))
}

/** Check if all required runtimes are available */
export function checkDockerAvailable() {
    const checks = {
        node: tryCommand("node --version"),
        python: tryCommand("python3 --version"),
        gcc: tryCommand("gcc --version | head -1"),
        gpp: tryCommand("g++ --version | head -1"),
        java: tryCommand("java --version 2>&1 | head -1"),
        javac: tryCommand("javac --version 2>&1"),
    }

    const allAvailable = Object.values(checks).every(v => v !== null)

    return Promise.resolve({
        available: allAvailable,
        version: "unified-container",
        runtimes: checks,
    })
}

/** Synchronously check if a command exists and get its version */
function tryCommand(cmd) {
    try {
        return execSync(cmd, { encoding: "utf-8", timeout: 3000 }).trim()
    } catch {
        return null
    }
}
