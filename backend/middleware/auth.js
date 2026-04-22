const jwt = require('jsonwebtoken');

/**
 * Very basic Permission check utility for the prototype.
 * ADR: RBAC (Role-Based Access Control) for security.
 */
const roles = {
    DOCTOR: {
        permissions: ['CREATE_PRESCRIPTION', 'VIEW_PRESCRIPTION']
    },
    PHARMACIST: {
        permissions: ['VIEW_PRESCRIPTION', 'DISPENSE_PRESCRIPTION']
    },
    PATIENT: {
        permissions: ['VIEW_OWN_PRESCRIPTION']
    }
};

const authorize = (requiredPermission) => {
    return (req, res, next) => {
        // For the prototype, we expect a header 'x-user-role' 
        // In a real system, this would be a verified JWT token.
        const userRole = req.headers['x-user-role']; 

        if (!userRole || !roles[userRole]) {
            return res.status(403).json({ error: "Access Denied: Unrecognized User Role." });
        }

        const userPermissions = roles[userRole].permissions;
        if (!userPermissions.includes(requiredPermission)) {
            return res.status(403).json({ 
                error: `Access Denied: Role ${userRole} does not have '${requiredPermission}' permission.` 
            });
        }

        next();
    };
};

module.exports = { authorize };
