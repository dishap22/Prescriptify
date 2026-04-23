const jwt = require('jsonwebtoken');

/**
 * ADR: RBAC (Role-Based Access Control) for security.
 * Integrated with JWT for proper Login/Session persistence.
 */
const roles = {
    DOCTOR: {
        permissions: ['CREATE_PRESCRIPTION', 'VIEW_PRESCRIPTION']
    },
    PHARMACIST: {
        permissions: ['VIEW_PRESCRIPTION', 'DISPENSE_PRESCRIPTION']
    },
    PATIENT: {
        permissions: ['VIEW_PRESCRIPTION'] // Handled in logic layer for ownership check
    }
};

const authorize = (requiredPermission) => {
    return (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];

        // 1. JWT Check
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'prototype-secret');
                req.user = decoded;

                const userPermissions = roles[decoded.role]?.permissions || [];
                if (userPermissions.includes(requiredPermission)) {
                    return next();
                }
                return res.status(403).json({ error: "Access Denied: Insufficient permissions." });
            } catch (err) {
                return res.status(401).json({ error: "Invalid token." });
            }
        }

        // 2. Fallback to Headers (for backward compatibility during prototype testing)
        const userRole = req.headers['x-user-role'];
        if (userRole && roles[userRole]?.permissions.includes(requiredPermission)) {
            return next();
        }

        return res.status(401).json({ error: "Authentication Required: No token or valid role header provided." });
    };
};

module.exports = { authorize };

