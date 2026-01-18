import pool from '../database.js';

/**
 * Logs a user action to the Audit_Logs table.
 * 
 * @param {Object} params - The parameters for the log.
 * @param {number} params.userId - The ID of the user performing the action.
 * @param {string} params.action - The action performed (e.g., 'LOGIN', 'CREATE_FAULT', 'DELETE_REPORT').
 * @param {string} [params.entityType] - The type of entity affected (e.g., 'Fault', 'User').
 * @param {number} [params.entityId] - The ID of the entity affected.
 * @param {Object|string} [params.details] - Additional details about the action.
 * @param {Object} [req] - Express request object to extract IP address.
 */
export const logAction = async ({ userId, action, entityType, entityId, details, req }) => {
    try {
        const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
        const detailsString = typeof details === 'object' ? JSON.stringify(details) : details;

        const query = `
            INSERT INTO Audit_Logs (user_id, action, entity_type, entity_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        await pool.query(query, [userId, action, entityType, entityId, detailsString, ipAddress]);
    } catch (error) {
        console.error('Failed to log audit action:', error);
        // We generally don't want to block the main flow if logging fails, 
        // but seeing the error in console is useful.
    }
};
