/**
 * Attendance Service
 * Handles attendance tracking for kasir users (clock-in/clock-out)
 */
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
export declare class AttendanceService {
    /**
     * Record clock-in when user logs in
     * Creates a new attendance record for the day
     * Detects and closes incomplete sessions from previous days
     *
     * @param request - Clock-in request with user ID and optional timestamp
     * @returns ClockInResponse with attendance ID and clock-in time
     * @throws ApiError if user not found or attendance already exists
     */
    static clockIn(request: ClockInRequest): Promise<ClockInResponse>;
    /**
     * Record clock-out when user logs out
     * Updates existing attendance record with clock-out time and calculates duration
     *
     * @param userId - User ID
     * @param clockOutTime - Clock-out timestamp (default: now)
     * @returns Updated attendance record with duration
     * @throws ApiError if attendance record not found
     */
    static clockOut(userId: string, clockOutTime?: Date): Promise<AttendanceRecord>;
    /**
     * Get today's attendance record for a user
     * Returns the current day's attendance record
     *
     * @param userId - User ID
     * @param date - Date to query (default: today)
     * @returns Attendance record or null if not found
     */
    static getTodaysAttendance(userId: string, date?: Date): Promise<AttendanceRecord | null>;
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
    static getAttendanceByPeriod(userId: string | null, startDate: Date, endDate: Date, limit?: number, offset?: number): Promise<{
        data: AttendanceRecord[];
        total: number;
    }>;
    /**
     * Format date to YYYY-MM-DD string
     * Helper method to ensure consistent date formatting
     *
     * @param date - Date to format
     * @returns Date string in YYYY-MM-DD format
     */
    private static formatDate;
    /**
     * Format date for display (public version of formatDate)
     * @param date - Date to format
     * @returns Date string in YYYY-MM-DD format
     */
    static formatDateForDisplay(date: Date): string;
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
    static getAttendanceWithUserInfo(userId: string | null, startDate: Date, endDate: Date, limit?: number, offset?: number): Promise<{
        data: any[];
        total: number;
    }>;
    /**
     * Get attendance summary for a date range
     * Returns aggregated statistics for attendance
     *
     * @param startDate - Start date (inclusive)
     * @param endDate - End date (inclusive)
     * @param storeId - Store ID (optional, filters to specific store)
     * @returns Attendance summary with aggregated statistics
     */
    static getAttendanceSummary(startDate: Date, endDate: Date, storeId?: string | null): Promise<{
        totalRecords: number;
        totalKasirs: number;
        averageDurationMinutes: number;
        totalDurationMinutes: number;
        presentCount: number;
        absentCount: number;
        incompleteCount: number;
    }>;
    /**
     * Get monthly attendance report
     * Aggregates attendance data for a specific month
     * Calculates total work days, total hours, and averages per user
     *
     * @param year - Year of the report
     * @param month - Month of the report (1-12)
     * @returns Aggregated monthly report with user statistics
     */
    static getMonthlyReport(year: number, month: number): Promise<{
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
    }>;
}
export default AttendanceService;
//# sourceMappingURL=attendance.d.ts.map