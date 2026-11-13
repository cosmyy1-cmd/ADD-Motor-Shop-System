
const crypto = require("crypto");

const SESSION_COOKIE_NAME = "addmotor_session";

const SESSION_DURATION = {
    normal: 8 * 60 * 60,
    remember: 30 * 24 * 60 * 60
};

// =========================================================
// SESSION TOKEN HELPERS
// =========================================================

function createSessionToken() {
    return crypto.randomBytes(32).toString("hex");
}

function hashSessionToken(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

// =========================================================
// COOKIE HELPERS
// =========================================================

function getCookie(req, name) {
    const cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
        return null;
    }

    const cookies = cookieHeader.split(";");

    for (const cookie of cookies) {
        const separatorIndex = cookie.indexOf("=");

        if (separatorIndex === -1) {
            continue;
        }

        const cookieName = cookie
            .slice(0, separatorIndex)
            .trim();

        if (cookieName === name) {
            return cookie
                .slice(separatorIndex + 1)
                .trim();
        }
    }

    return null;
}

function setSessionCookie(res, token, remember) {
    const parts = [
        `${SESSION_COOKIE_NAME}=${token}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax"
    ];

    if (remember) {
        parts.push(
            `Max-Age=${SESSION_DURATION.remember}`
        );
    }

    if (process.env.NODE_ENV === "production") {
        parts.push("Secure");
    }

    res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(res) {
    const parts = [
        `${SESSION_COOKIE_NAME}=`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=0"
    ];

    if (process.env.NODE_ENV === "production") {
        parts.push("Secure");
    }

    res.setHeader("Set-Cookie", parts.join("; "));
}

// =========================================================
// CREATE DATABASE SESSION
// =========================================================

async function createSession(db, userId, remember) {
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);

    const duration = remember
        ? SESSION_DURATION.remember
        : SESSION_DURATION.normal;

    await db.execute(
        `INSERT INTO user_sessions
            (user_id, token_hash, expires_at)
         VALUES
            (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND))`,
        [
            userId,
            tokenHash,
            duration
        ]
    );

    return {
        token,
        duration
    };
}

// =========================================================
// AUTHENTICATION MIDDLEWARE
// =========================================================

function createAuthMiddleware(db) {

    async function authenticate(req, res, next) {
        try {
            const token = getCookie(
                req,
                SESSION_COOKIE_NAME
            );

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required."
                });
            }

            const tokenHash = hashSessionToken(token);

            const [rows] = await db.execute(
                `SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.phone,
                    u.address,
                    u.role,
                    u.created_at,
                    s.id AS session_id
                 FROM user_sessions s
                 INNER JOIN users u
                    ON u.id = s.user_id
                 WHERE s.token_hash = ?
                   AND s.expires_at > UTC_TIMESTAMP()
                 LIMIT 1`,
                [tokenHash]
            );

            if (!rows.length) {
                clearSessionCookie(res);

                return res.status(401).json({
                    success: false,
                    message: "Your session has expired. Please log in again."
                });
            }

            req.user = rows[0];

            next();

        } catch (error) {
            console.error(
                "Authentication middleware error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to verify your session."
            });
        }
    }

    // =====================================================
    // ADMIN AUTHENTICATION
    // =====================================================

    async function requireAdmin(req, res, next) {
        return authenticate(req, res, () => {

            if (
                String(req.user.role).toLowerCase() !== "admin"
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Administrator access is required."
                });
            }

            next();
        });
    }

    // =====================================================
    // CUSTOMER AUTHENTICATION
    // =====================================================

    async function requireCustomer(req, res, next) {
        return authenticate(req, res, () => {

            if (
                String(req.user.role).toLowerCase() !== "customer"
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Customer access is required."
                });
            }

            next();
        });
    }

    return {
        authenticate,
        requireAdmin,
        requireCustomer
    };
}

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
    SESSION_COOKIE_NAME,
    createSession,
    createAuthMiddleware,
    hashSessionToken,
    getCookie,
    setSessionCookie,
    clearSessionCookie
};
