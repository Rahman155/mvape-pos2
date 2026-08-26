/**
 * Send a successful API response
 */
export function sendSuccess(res, data, statusCode = 200, requestId) {
    return res.status(statusCode).json({
        data,
        meta: {
            timestamp: new Date().toISOString(),
            ...(requestId && { requestId }),
        },
    });
}
/**
 * Send a paginated API response
 */
export function sendPaginated(res, data, pagination, statusCode = 200, requestId) {
    return res.status(statusCode).json({
        data,
        pagination,
        meta: {
            timestamp: new Date().toISOString(),
            ...(requestId && { requestId }),
        },
    });
}
/**
 * Send a created response (201)
 */
export function sendCreated(res, data, requestId) {
    return sendSuccess(res, data, 201, requestId);
}
/**
 * Send a no content response (204)
 */
export function sendNoContent(res) {
    return res.status(204).send();
}
/**
 * Send an accepted response (202)
 */
export function sendAccepted(res, data, requestId) {
    if (data) {
        return sendSuccess(res, data, 202, requestId);
    }
    return res.status(202).send();
}
/**
 * Helper to calculate pagination info
 */
export function calculatePagination(total, page = 1, pageSize = 20) {
    const pages = Math.ceil(total / pageSize);
    const validPage = Math.max(1, Math.min(page, pages || 1));
    const skip = (validPage - 1) * pageSize;
    return {
        total,
        page: validPage,
        pageSize,
        pages: pages || 0,
        skip,
    };
}
/**
 * Validate pagination parameters
 */
export function validatePaginationParams(page, pageSize, maxPageSize = 100) {
    let parsedPage = 1;
    let parsedPageSize = 20;
    if (page !== undefined) {
        parsedPage = Math.max(1, parseInt(String(page), 10) || 1);
    }
    if (pageSize !== undefined) {
        parsedPageSize = Math.max(1, Math.min(parseInt(String(pageSize), 10) || 20, maxPageSize));
    }
    return { page: parsedPage, pageSize: parsedPageSize };
}
//# sourceMappingURL=response.js.map