/**
 * Attendance Service
 * Handles attendance tracking for kasir users (clock-in/clock-out)
 */

import { db } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import { ApiError, ApiErrorCode } from '../utils/errors.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Attendance Record Interface
 */
export interface AttendanceRecord {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'INCOMPLETE';
  created_at: string;
}

/**
 * Clock-In Request
 */
export interface ClockInRequest {
  userId: string;
  storeId?: string;
  clockInTime?: Date;
}

/**
 * Clock-In Response
 */
export interface ClockInResponse {
  attendanceId: string;
  userId: string;
  clockInTime: string;
  date: string;
}

/**
 * Attendance Service
 */
export class AttendanceService {
  /**
   * Record clock-in when user logs in
   * Creates a new attendance record for the day
   * Detects and closes incomplete sessions from previous days
   *
   * @param request - Clock-in request with user ID and optional timestamp
   * @returns ClockInResponse with attendance ID and clock-in time
   * @throws ApiError if user not found or attendance already exists
   */
  static async clockIn(request: ClockInRequest): Promise<ClockInResponse> {
    try {
      const { userId, clockInTime = new Date() } = request;

      // Validate user exists and has KASIR role
      const userResult = await db.query(
        'SELECT id, role, is_active FROM users WHERE id = $1',
        [userId]
      );

      if (!userResult.rows || userResult.rows.length === 0) {
        throw new ApiError('User not found', ApiErrorCode.NOT_FOUND, 404);
      }

      const user = userResult.rows[0];

      // Only KASIR role can have attendance records
      if (user.role !== 'KASIR') {
        logger.warn('Non-KASIR user attempted clock-in', {
          userId,
          role: user.role,
        });
        // Don't throw error, just silently skip for non-KASIR users
        return {
          attendanceId: uuidv4(),
          userId,
          clockInTime: clockInTime.toISOString(),
          date: this.formatDate(clockInTime),
        };
      }

      // Check if user is active
      if (!user.is_active) {
        throw new ApiError(
          'User account is inactive',
          ApiErrorCode.UNAUTHORIZED,
          401
        );
      }

      const date = this.formatDate(clockInTime);
      const clockInTimeISO = clockInTime.toISOString();

      // TASK 48: Check for incomplete attendance record from previous day
      // If found, mark it as complete by setting clock_out to current clock_in time
      const incompleteResult = await db.query(
        `SELECT id, clock_in, date FROM attendance 
         WHERE user_id = $1 AND clock_out IS NULL AND status = 'PRESENT' AND date < $2
         ORDER BY date DESC LIMIT 1`,
        [userId, date]
      );

      if (incompleteResult.rows && incompleteResult.rows.length > 0) {
        const incompleteRecord = incompleteResult.rows[0] as AttendanceRecord;
        const previousClockIn = new Date(incompleteRecord.clock_in);
        const durationMinutes = Math.round(
          (clockInTime.getTime() - previousClockIn.getTime()) / 60000
        );

        // Update the incomplete record: set clock_out and duration
        await db.query(
          `UPDATE attendance 
           SET clock_out = $1, duration_minutes = $2, status = 'PRESENT', updated_at = NOW()
           WHERE id = $3`,
          [clockInTimeISO, durationMinutes, incompleteRecord.id]
        );

        logger.info('Incomplete clock-out detected and completed', {
          attendanceId: incompleteRecord.id,
          userId,
          previousDate: incompleteRecord.date,
          durationMinutes,
          requestId: 'system',
        });
      }

      // Check if attendance record already exists for this user today
      const existingResult = await db.query(
        'SELECT id, clock_in FROM attendance WHERE user_id = $1 AND date = $2',
        [userId, date]
      );

      if (existingResult.rows && existingResult.rows.length > 0) {
        // Attendance record already exists for today
        const existing = existingResult.rows[0];
        logger.warn('Attendance record already exists for today', {
          userId,
          date,
          existingId: existing.id,
          existingClockIn: existing.clock_in,
        });

        // Return existing attendance ID (duplicate login)
        return {
          attendanceId: existing.id,
          userId,
          clockInTime: existing.clock_in,
          date,
        };
      }

      // Create new attendance record for current session
      const attendanceId = uuidv4();
      const insertResult = await db.query(
        `INSERT INTO attendance (id, user_id, clock_in, date, status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, user_id, clock_in, date, status, created_at`,
        [attendanceId, userId, clockInTimeISO, date, 'PRESENT']
      );

      if (!insertResult.rows || insertResult.rows.length === 0) {
        throw new ApiError(
          'Failed to create attendance record',
          ApiErrorCode.DATABASE_ERROR,
          500
        );
      }

      const record = insertResult.rows[0] as AttendanceRecord;

      logger.info('User clocked in', {
        attendanceId: record.id,
        userId,
        date,
        clockInTime: record.clock_in,
      });

      return {
        attendanceId: record.id,
        userId,
        clockInTime: record.clock_in,
        date: record.date,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Clock-in failed', error as Error);
      throw new ApiError('Clock-in failed', ApiErrorCode.INTERNAL_ERROR, 500);
    }
  }

  /**
   * Record clock-out when user logs out
   * Updates existing attendance record with clock-out time and calculates duration
   *
   * @param userId - User ID
   * @param clockOutTime - Clock-out timestamp (default: now)
   * @returns Updated attendance record with duration
   * @throws ApiError if attendance record not found
   */
  static async clockOut(
    userId: string,
    clockOutTime: Date = new Date()
  ): Promise<AttendanceRecord> {
    try {
      const date = this.formatDate(clockOutTime);
      const clockOutTimeISO = clockOutTime.toISOString();

      // Find today's attendance record
      const selectResult = await db.query(
        'SELECT id, clock_in, date FROM attendance WHERE user_id = $1 AND date = $2',
        [userId, date]
      );

      if (!selectResult.rows || selectResult.rows.length === 0) {
        logger.warn('No attendance record found for clock-out', {
          userId,
          date,
        });
        throw new ApiError(
          'No attendance record found for today',
          ApiErrorCode.NOT_FOUND,
          404
        );
      }

      const record = selectResult.rows[0] as AttendanceRecord;

      // Calculate duration in minutes
      const clockInTime = new Date(record.clock_in);
      const clockOutTimeDate = new Date(clockOutTimeISO);
      const durationMinutes = Math.round(
        (clockOutTimeDate.getTime() - clockInTime.getTime()) / 60000
      );

      // Update attendance record with clock-out time
      const updateResult = await db.query(
        `UPDATE attendance 
         SET clock_out = $1, duration_minutes = $2, status = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id, user_id, clock_in, clock_out, duration_minutes, date, status, created_at`,
        [clockOutTimeISO, durationMinutes, 'PRESENT', record.id]
      );

      if (!updateResult.rows || updateResult.rows.length === 0) {
        throw new ApiError(
          'Failed to update attendance record',
          ApiErrorCode.DATABASE_ERROR,
          500
        );
      }

      const updatedRecord = updateResult.rows[0] as AttendanceRecord;

      logger.info('User clocked out', {
        attendanceId: updatedRecord.id,
        userId,
        date,
        clockOutTime: updatedRecord.clock_out,
        durationMinutes: updatedRecord.duration_minutes,
      });

      return updatedRecord;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Clock-out failed', error as Error);
      throw new ApiError('Clock-out failed', ApiErrorCode.INTERNAL_ERROR, 500);
    }
  }

  /**
   * Get today's attendance record for a user
   * Returns the current day's attendance record
   *
   * @param userId - User ID
   * @param date - Date to query (default: today)
   * @returns Attendance record or null if not found
   */
  static async getTodaysAttendance(
    userId: string,
    date: Date = new Date()
  ): Promise<AttendanceRecord | null> {
    try {
      const dateStr = this.formatDate(date);

      const result = await db.query(
        'SELECT id, user_id, clock_in, clock_out, duration_minutes, date, status, created_at FROM attendance WHERE user_id = $1 AND date = $2',
        [userId, dateStr]
      );

      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as AttendanceRecord;
    } catch (error) {
      logger.error('Failed to get attendance record', error as Error);
      throw new ApiError(
        'Failed to retrieve attendance record',
        ApiErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Get attendance records for a period
   * Returns paginated attendance records for specified user and date range
   *
   * @param userId - User ID (optional, if provided filters to specific user)
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @param limit - Number of records per page
   * @param offset - Pagination offset
   * @returns Paginated attendance records
   */
  static async getAttendanceByPeriod(
    userId: string | null,
    startDate: Date,
    endDate: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ data: AttendanceRecord[]; total: number }> {
    try {
      const startDateStr = this.formatDate(startDate);
      const endDateStr = this.formatDate(endDate);

      let countQuery =
        'SELECT COUNT(*) as count FROM attendance WHERE date >= $1 AND date <= $2';
      let countParams: any[] = [startDateStr, endDateStr];

      let dataQuery = `SELECT id, user_id, clock_in, clock_out, duration_minutes, date, status, created_at 
                      FROM attendance 
                      WHERE date >= $1 AND date <= $2
                      ORDER BY date DESC, clock_in DESC
                      LIMIT $3 OFFSET $4`;
      let dataParams: any[] = [startDateStr, endDateStr, limit, offset];

      // If userId provided, filter to specific user
      if (userId) {
        countQuery += ' AND user_id = $3';
        countParams.push(userId);

        dataQuery = `SELECT id, user_id, clock_in, clock_out, duration_minutes, date, status, created_at 
                    FROM attendance 
                    WHERE date >= $1 AND date <= $2 AND user_id = $3
                    ORDER BY date DESC, clock_in DESC
                    LIMIT $4 OFFSET $5`;
        dataParams = [startDateStr, endDateStr, userId, limit, offset];
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count || '0', 10);

      const dataResult = await db.query(dataQuery, dataParams);
      const data = (dataResult.rows || []) as AttendanceRecord[];

      return { data, total };
    } catch (error) {
      logger.error('Failed to get attendance records', error as Error);
      throw new ApiError(
        'Failed to retrieve attendance records',
        ApiErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Format date to YYYY-MM-DD string
   * Helper method to ensure consistent date formatting
   *
   * @param date - Date to format
   * @returns Date string in YYYY-MM-DD format
   */
  private static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Format date for display (public version of formatDate)
   * @param date - Date to format
   * @returns Date string in YYYY-MM-DD format
   */
  static formatDateForDisplay(date: Date): string {
    return this.formatDate(date);
  }

  /**
   * Get attendance records with user information
   * Returns paginated attendance records including user details
   *
   * @param userId - User ID (optional, if provided filters to specific user)
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @param limit - Number of records per page
   * @param offset - Pagination offset
   * @returns Paginated attendance records with user info
   */
  static async getAttendanceWithUserInfo(
    userId: string | null,
    startDate: Date,
    endDate: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ data: any[]; total: number }> {
    try {
      const startDateStr = this.formatDate(startDate);
      const endDateStr = this.formatDate(endDate);

      let countQuery = `
        SELECT COUNT(*) as count 
        FROM attendance a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.date >= $1 AND a.date <= $2
      `;
      let countParams: any[] = [startDateStr, endDateStr];

      let dataQuery = `
        SELECT 
          a.id, a.user_id, a.clock_in, a.clock_out, a.duration_minutes, a.date, a.status, a.created_at,
          u.username, u.name
        FROM attendance a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.date >= $1 AND a.date <= $2
        ORDER BY a.date DESC, a.clock_in DESC
        LIMIT $3 OFFSET $4
      `;
      let dataParams: any[] = [startDateStr, endDateStr, limit, offset];

      // If userId provided, filter to specific user
      if (userId) {
        countQuery += ' AND a.user_id = $3';
        countParams.push(userId);

        dataQuery = `
          SELECT 
            a.id, a.user_id, a.clock_in, a.clock_out, a.duration_minutes, a.date, a.status, a.created_at,
            u.username, u.name
          FROM attendance a
          LEFT JOIN users u ON a.user_id = u.id
          WHERE a.date >= $1 AND a.date <= $2 AND a.user_id = $3
          ORDER BY a.date DESC, a.clock_in DESC
          LIMIT $4 OFFSET $5
        `;
        dataParams = [startDateStr, endDateStr, userId, limit, offset];
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count || '0', 10);

      const dataResult = await db.query(dataQuery, dataParams);
      const data = (dataResult.rows || []) as any[];

      return { data, total };
    } catch (error) {
      logger.error('Failed to get attendance records with user info', error as Error);
      throw new ApiError(
        'Failed to retrieve attendance records',
        ApiErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Get attendance summary for a date range
   * Returns aggregated statistics for attendance
   *
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @param storeId - Store ID (optional, filters to specific store)
   * @returns Attendance summary with aggregated statistics
   */
  static async getAttendanceSummary(
    startDate: Date,
    endDate: Date,
    storeId: string | null = null
  ): Promise<{
    totalRecords: number;
    totalKasirs: number;
    averageDurationMinutes: number;
    totalDurationMinutes: number;
    presentCount: number;
    absentCount: number;
    incompleteCount: number;
  }> {
    try {
      const startDateStr = this.formatDate(startDate);
      const endDateStr = this.formatDate(endDate);

      let query = `
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT a.user_id) as total_kasirs,
          COALESCE(AVG(a.duration_minutes), 0) as avg_duration_minutes,
          COALESCE(SUM(a.duration_minutes), 0) as total_duration_minutes,
          SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) as absent_count,
          SUM(CASE WHEN a.status = 'INCOMPLETE' THEN 1 ELSE 0 END) as incomplete_count
        FROM attendance a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.date >= $1 AND a.date <= $2
      `;
      let params: any[] = [startDateStr, endDateStr];

      // If storeId provided, filter to specific store
      if (storeId) {
        query += ' AND u.store_id = $3';
        params.push(storeId);
      }

      const result = await db.query(query, params);

      if (!result.rows || result.rows.length === 0) {
        return {
          totalRecords: 0,
          totalKasirs: 0,
          averageDurationMinutes: 0,
          totalDurationMinutes: 0,
          presentCount: 0,
          absentCount: 0,
          incompleteCount: 0,
        };
      }

      const row = result.rows[0];

      return {
        totalRecords: parseInt(row.total_records || '0', 10),
        totalKasirs: parseInt(row.total_kasirs || '0', 10),
        averageDurationMinutes: Math.round(parseFloat(row.avg_duration_minutes || '0')),
        totalDurationMinutes: parseInt(row.total_duration_minutes || '0', 10),
        presentCount: parseInt(row.present_count || '0', 10),
        absentCount: parseInt(row.absent_count || '0', 10),
        incompleteCount: parseInt(row.incomplete_count || '0', 10),
      };
    } catch (error) {
      logger.error('Failed to get attendance summary', error as Error);
      throw new ApiError(
        'Failed to retrieve attendance summary',
        ApiErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Get monthly attendance report
   * Aggregates attendance data for a specific month
   * Calculates total work days, total hours, and averages per user
   *
   * @param year - Year of the report
   * @param month - Month of the report (1-12)
   * @returns Aggregated monthly report with user statistics
   */
  static async getMonthlyReport(
    year: number,
    month: number
  ): Promise<{
    report: Array<{
      userId: string;
      username: string;
      name: string;
      totalWorkDays: number;
      totalHours: number;
      averageHoursPerDay: number;
    }>;
    summary: {
      totalEmployees: number;
      totalWorkDays: number;
      totalHoursWorked: number;
      averageHoursPerEmployee: number;
    };
  }> {
    try {
      // Validate month
      if (month < 1 || month > 12) {
        throw new ApiError('Invalid month (1-12)', ApiErrorCode.VALIDATION_ERROR, 400);
      }

      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      const startDateStr = this.formatDate(monthStart);
      const endDateStr = this.formatDate(monthEnd);

      // Query to get aggregated attendance data for the month
      const query = `
        SELECT 
          u.id as user_id,
          u.username,
          u.name,
          COUNT(DISTINCT a.date) as total_work_days,
          SUM(a.duration_minutes) as total_minutes,
          COUNT(DISTINCT a.date) as work_days_count
        FROM users u
        LEFT JOIN attendance a ON u.id = a.user_id 
          AND a.date >= $1 AND a.date <= $2 
          AND a.status = 'PRESENT'
          AND a.clock_out IS NOT NULL
        WHERE u.role = 'KASIR'
        GROUP BY u.id, u.username, u.name
        ORDER BY u.name ASC
      `;

      const result = await db.query(query, [startDateStr, endDateStr]);

      if (!result.rows) {
        throw new ApiError(
          'Failed to generate report',
          ApiErrorCode.DATABASE_ERROR,
          500
        );
      }

      // Process results
      const report = result.rows.map((row: any) => {
        const totalMinutes = row.total_minutes ? parseInt(row.total_minutes, 10) : 0;
        const totalHours = parseFloat((totalMinutes / 60).toFixed(2));
        const totalWorkDays = parseInt(row.total_work_days, 10) || 0;
        const averageHoursPerDay =
          totalWorkDays > 0 ? parseFloat((totalHours / totalWorkDays).toFixed(2)) : 0;

        return {
          userId: row.user_id,
          username: row.username,
          name: row.name,
          totalWorkDays,
          totalHours,
          averageHoursPerDay,
        };
      });

      // Calculate summary statistics
      const totalEmployees = report.length;
      const totalWorkDays = report.reduce((sum, r) => sum + r.totalWorkDays, 0);
      const totalHoursWorked = parseFloat(
        report.reduce((sum, r) => sum + r.totalHours, 0).toFixed(2)
      );
      const averageHoursPerEmployee =
        totalEmployees > 0
          ? parseFloat((totalHoursWorked / totalEmployees).toFixed(2))
          : 0;

      logger.info('Monthly attendance report generated', {
        year,
        month,
        totalEmployees,
        totalWorkDays,
        totalHoursWorked,
      });

      return {
        report,
        summary: {
          totalEmployees,
          totalWorkDays,
          totalHoursWorked,
          averageHoursPerEmployee,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Failed to generate monthly report', error as Error);
      throw new ApiError(
        'Failed to generate report',
        ApiErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }
}

export default AttendanceService;
