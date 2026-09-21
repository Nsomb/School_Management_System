export interface StudentAttendanceFormData {
  studentId: number;
  className: string;
  attendanceDate: string;
  status: 'Present' | 'Absent' | 'Excused' | 'Late';
  reason?: string;
  markedBy: string;
}

export interface TeacherAttendanceFormData {
  teacherId: number;
  attendanceDate: string;
  status: 'Present' | 'Absent' | 'Excused' | 'Late';
  reason?: string;
  markedBy: string;
}

export interface AttendanceFilters {
  page?: number;
  limit?: number;
  className?: string;
  dateFrom?: string;
  dateTo?: string;
  studentId?: string;
  teacherId?: string;
  academicYear?: string;
  term?: string;
}

export interface ExpectedDay {
  dayOfWeek: string;
  isFullDayExpected: boolean;
  expectedHalfDayType?: 'Morning' | 'Afternoon';
}

export interface BulkExpectedDaysData {
  teacherId: number;
  expectedDays: ExpectedDay[];
}

export interface ClassAttendanceRecord {
  studentId: number;
  status: 'Present' | 'Absent' | 'Excused' | 'Late';
  reason?: string;
}

export interface MarkClassAttendanceData {
  className: string;
  attendanceDate: string;
  markedBy: string;
  records: ClassAttendanceRecord[];
}

export interface MarkTeachersAttendanceData {
  attendanceDate: string;
  markedBy: string;
  records: {
    teacherId: number;
    status: 'Present' | 'Absent' | 'Excused' | 'Late';
    reason?: string;
  }[];
}

export interface SetExpectedDayData {
  teacherId: number;
  dayOfWeek: string;
  isFullDayExpected: boolean;
  expectedHalfDayType?: 'Morning' | 'Afternoon';
}

export interface SetBulkExpectedDaysData {
  teacherId: number;
  expectedDays: ExpectedDay[];
}

export interface LockAttendanceData {
  className?: string;   // for student lock, required
  attendanceDate: string;
}

export interface DashboardStats {
  students: {
    total_student_records: number;
    student_present: number;
    student_absent: number;
    student_late: number;
    student_excused: number;
  };
  teachers: {
    total_teacher_records: number;
    teacher_present: number;
    teacher_absent: number;
    teacher_late: number;
    teacher_excused: number;
  };
}

export interface MonthlySummary {
  class_name?: string;
  teacher_name?: string;
  teacher_id?: number;
  total_records: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  excused_days: number;
  attendance_percentage: number;
}

export interface TeacherExpectedDay {
  id?: number;
  teacher_id: number;
  day_of_week: string;
  is_full_day_expected: boolean;
  expected_half_day_type?: 'Morning' | 'Afternoon' | null;
  created_at?: string;
  updated_at?: string;
}

export interface TeacherWithExpectedDays {
  teacher_id: number;
  full_name: string;
  day_of_week?: string;
  is_full_day_expected?: boolean;
  expected_half_day_type?: 'Morning' | 'Afternoon' | null;
  created_at?: string;
  updated_at?: string;
}

// Additional types used by useAttendance
export interface StudentAttendance {
  id: number;
  student_id: number;
  student_name: string;
  class_name: string;
  attendance_date: string;
  status: string;
  reason: string;
  academic_year: string;
  term: string;
  locked_at?: string;
  locked_by?: string;
}

export interface TeacherAttendance {
  id: number;
  teacher_id: number;
  teacher_name: string;
  attendance_date: string;
  status: string;
  reason: string;
  academic_year: string;
  term: string;
  locked_at?: string;
  locked_by?: string;
}

export interface AcademicContext {
  academic_year: string;
  term: string;
}

export interface ArchiveLog {
  archive_batch_id: string;
  academic_year: string;
  archived_by: string;
  archived_at: string;
  student_count: number;
  teacher_count: number;
}

export interface ArchiveOperationResult {
  archiveBatchId?: string;
  studentCount?: number;
  teacherCount?: number;
  restoredStudents?: number;
  restoredTeachers?: number;
  deletedStudentRows?: number;
  deletedTeacherRows?: number;
  deletedLogRows?: number;
  purgedBatches?: number;
}

export interface Student {
  id: number;
  full_name: string;
  class_id?: number;
  class_name?: string;
}

export interface Teacher {
  id: number;
  full_name: string;
}