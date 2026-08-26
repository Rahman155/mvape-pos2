/**
 * Attendance routes
 * Handles attendance tracking endpoints for viewing records and reports
 */
import express from 'express';
import { logger } from '../utils/logger.js';
import { AttendanceService } from '../services/attendance.js';
import { ApiError, ApiErrorCode } from '../utils/errors.js';
import { requireAuth, requireOwner } from '../middleware/auth.js';
export const attendanceRouter = express.Router();
/**
 * GET /api/v1/attendance
 * Protected endpoint - returns attendance records with filters
 * Requires Owner role for access to all records
 *
 * Query parameters:
 * - startDate (optional): Start date in YYYY-MM-DD format
 * - endDate (optional): End date in YYYY-MM-DD format
 * - userId (optional): Filter by specific user ID
 * - limit (optional): Records per page (default: 50, max: 500)
 * - offset (optional): Pagination offset (default: 0)
 *
 * Response (200):
 * {
 *   "data": {
 *     "attendance": [
 *       {
 *         "id": "attendance-uuid",
 *         "userId": "user-id",
 *         "username": "john_doe",
 *         "name": "John Doe",
 *         "date": "2024-01-15",
 *         "clockIn": "2024-01-15T09:00:00Z",
 *         "clockOut": "2024-01-15T17:30:00Z",
 *         "durationMinutes": 510,
 *         "status": "PRESENT"
 *       }
 *     ],
 *     "pagination": {
 *       "total": 150,
 *       "limit": 50,
 *       "offset": 0,
 *       "pages": 3
 *     }
 *   },
 *   "meta": {
 *     "timestamp": "2024-01-15T10:30:00.000Z",
 *     "requestId": "req-123"
 *   }
 * }
 *
 * Response (403):
 * {
 *   "error": {
 *     "message": "Insufficient permissions",
 *     "code": "FORBIDDEN",
 *     "statusCode": 403
 *   },
 *   "requestId": "req-123"
 * }
 */
attendanceRouter.get('/', requireAuth(), requireOwner(), async (req, res, next) => {
    try {
        const { startDate, endDate, userId, limit = 50, offset = 0 } = req.query;
        // Validate pagination params
        const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 500);
        const offsetNum = Math.max(parseInt(offset) || 0, 0);
        // Parse dates
        let start = null;
        let end = null;
        if (startDate) {
            start = new Date(startDate);
            if (isNaN(start.getTime())) {
                throw new ApiError('Invalid startDate format (use YYYY-MM-DD)', ApiErrorCode.VALIDATION_ERROR, 400);
            }
        }
        if (endDate) {
            end = new Date(endDate);
            if (isNaN(end.getTime())) {
                throw new ApiError('Invalid endDate format (use YYYY-MM-DD)', ApiErrorCode.VALIDATION_ERROR, 400);
            }
        }
        // Default to last 30 days if no date range specified
        if (!start || !end) {
            end = new Date();
            start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        // Validate date range
        if (start > end) {
            throw new ApiError('startDate must be before or equal to endDate', ApiErrorCode.VALIDATION_ERROR, 400);
        }
        // Get attendance records with user information
        const { data, total } = await AttendanceService.getAttendanceWithUserInfo(userId || null, start, end, limitNum, offsetNum);
        // Format response
        const attendance = data.map((record) => ({
            id: record.id,
            userId: record.user_id,
            username: record.username,
            name: record.name,
            date: record.date,
            clockIn: record.clock_in,
            clockOut: record.clock_out,
            durationMinutes: record.duration_minutes,
            status: record.status,
        }));
        const pages = Math.ceil(total / limitNum);
        logger.info('Attendance records retrieved', {
            userId: req.user?.id,
            recordCount: attendance.length,
            total,
            requestId: req.requestId,
        });
        res.status(200).json({
            data: {
                attendance,
                pagination: {
                    total,
                    limit: limitNum,
                    offset: offsetNum,
                    pages,
                },
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/attendance/report
 * Protected endpoint - returns monthly attendance report with aggregations
 * Requires Owner role for access
 *
 * Query parameters:
 * - year (required): Year of the report (e.g., 2024)
 * - month (required): Month of the report (1-12)
 *
 * Response (200):
 * {
 *   "data": {
 *     "report": [
 *       {
 *         "userId": "user-id",
 *         "username": "john_doe",
 *         "name": "John Doe",
 *         "totalWorkDays": 20,
 *         "totalHours": 160,
 *         "averageHoursPerDay": 8
 *       }
 *     ],
 *     "summary": {
 *       "totalEmployees": 5,
 *       "totalWorkDays": 100,
 *       "totalHoursWorked": 800,
 *       "averageHoursPerEmployee": 160
 *     }
 *   },
 *   "meta": {
 *     "timestamp": "2024-01-15T10:30:00.000Z",
 *     "requestId": "req-123",
 *     "reportPeriod": "2024-01"
 *   }
 * }
 *
 * Response (400):
 * {
 *   "error": {
 *     "message": "Invalid month (1-12)",
 *     "code": "VALIDATION_ERROR",
 *     "statusCode": 400
 *   },
 *   "requestId": "req-123"
 * }
 *
 * Response (403):
 * {
 *   "error": {
 *     "message": "Insufficient permissions",
 *     "code": "FORBIDDEN",
 *     "statusCode": 403
 *   },
 *   "requestId": "req-123"
 * }
 */
attendanceRouter.get('/report', requireAuth(), requireOwner(), async (req, res, next) => {
    try {
        const { year, month } = req.query;
        // Validate required parameters
        if (!year || !month) {
            throw new ApiError('year and month query parameters are required', ApiErrorCode.VALIDATION_ERROR, 400);
        }
        const yearNum = parseInt(year, 10);
        const monthNum = parseInt(month, 10);
        // Validate year and month
        if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
            throw new ApiError('Invalid year (2000-2100)', ApiErrorCode.VALIDATION_ERROR, 400);
        }
        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            throw new ApiError('Invalid month (1-12)', ApiErrorCode.VALIDATION_ERROR, 400);
        }
        // Generate monthly report
        const reportData = await AttendanceService.getMonthlyReport(yearNum, monthNum);
        const reportPeriod = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
        logger.info('Monthly attendance report generated', {
            userId: req.user?.id,
            reportPeriod,
            employeeCount: reportData.report.length,
            totalWorkDays: reportData.summary.totalWorkDays,
            requestId: req.requestId,
        });
        res.status(200).json({
            data: reportData,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId,
                reportPeriod,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/attendance/summary
 * Protected endpoint - returns aggregated attendance summary
 * Requires Owner role for access
 *
 * Query parameters:
 * - startDate (optional): Start date in YYYY-MM-DD format
 * - endDate (optional): End date in YYYY-MM-DD format
 * - storeId (optional): Filter by specific store
 *
 * Response (200):
 * {
 *   "data": {
 *     "summary": {
 *       "totalRecords": 150,
 *       "totalKasirs": 5,
 *       "averageDurationMinutes": 480,
 *       "totalDurationMinutes": 72000,
 *       "averageClockInTime": "09:00:00",
 *       "averageClockOutTime": "17:30:00",
 *       "presentCount": 140,
 *       "absentCount": 10
 *     }
 *   },
 *   "meta": {
 *     "timestamp": "2024-01-15T10:30:00.000Z",
 *     "requestId": "req-123",
 *     "period": "2024-01-15 to 2024-01-15"
 *   }
 * }
 *
 * Response (403):
 * {
 *   "error": {
 *     "message": "Insufficient permissions",
 *     "code": "FORBIDDEN",
 *     "statusCode": 403
 *   },
 *   "requestId": "req-123"
 * }
 */
attendanceRouter.get('/summary', requireAuth(), requireOwner(), async (req, res, next) => {
    try {
        const { startDate, endDate, storeId } = req.query;
        // Parse dates
        let start = null;
        let end = null;
        if (startDate) {
            start = new Date(startDate);
            if (isNaN(start.getTime())) {
                throw new ApiError('Invalid startDate format (use YYYY-MM-DD)', ApiErrorCode.VALIDATION_ERROR, 400);
            }
        }
        if (endDate) {
            end = new Date(endDate);
            if (isNaN(end.getTime())) {
                throw new ApiError('Invalid endDate format (use YYYY-MM-DD)', ApiErrorCode.VALIDATION_ERROR, 400);
            }
        }
        // Default to last 7 days if no date range specified
        if (!start || !end) {
            end = new Date();
            start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        // Validate date range
        if (start > end) {
            throw new ApiError('startDate must be before or equal to endDate', ApiErrorCode.VALIDATION_ERROR, 400);
        }
        // Get attendance summary
        const summary = await AttendanceService.getAttendanceSummary(start, end, storeId || null);
        const periodStr = `${AttendanceService.formatDateForDisplay(start)} to ${AttendanceService.formatDateForDisplay(end)}`;
        logger.info('Attendance summary retrieved', {
            userId: req.user?.id,
            period: periodStr,
            requestId: req.requestId,
        });
        res.status(200).json({
            data: {
                summary,
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId,
                period: periodStr,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
export default attendanceRouter;
//# sourceMappingURL=attendance.js.map