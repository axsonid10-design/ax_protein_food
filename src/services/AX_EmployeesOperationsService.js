import { supabase } from './supabaseClient.js'
import { generateUUID } from '../utils/AX_UUID.js'
import { AX_RecycleBinService } from './AX_RecycleBinService.js'

export const AX_EmployeesOperationsService = {
  fetchCompanyEmployeesFromDB: async () => {
    if (!supabase?.from) return { success: false, data: [] }
    try {
      const { data, error } = await supabase
        .from('ax_company_employees')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      return { success: true, data: data || [] }
    } catch (err) {
      return { success: false, error: err.message, data: [] }
    }
  },

  addCompanyEmployeeInDB: async (emp, userProfile = null) => {
    if (!supabase?.from || !emp) return { success: false }
    try {
      const id = emp.id || generateUUID()
      const code = emp.code || `EMP-${Date.now().toString().slice(-4)}`
      const row = {
        id,
        code,
        name: emp.name || '',
        phone: emp.phone || null,
        national_id: emp.nationalId || emp.national_id || null,
        department: emp.department || 'التشغيل والمصنع',
        job_title: emp.jobTitle || emp.job_title || 'عامل تشغيل',
        salary_type: emp.salaryType || emp.salary_type || 'monthly',
        base_salary: Number(emp.baseSalary ?? emp.base_salary ?? 0),
        daily_rate: Number(emp.dailyRate ?? emp.daily_rate ?? 0),
        hire_date: emp.hireDate || emp.hire_date || new Date().toISOString().split('T')[0],
        status: emp.status || 'active',
        notes: emp.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase.from('ax_company_employees').insert([row]).select().single()
      if (error) throw error

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_company_employees',
          action: 'CREATE_EMPLOYEE',
          record_id: id,
          new_data: { name: row.name, code: row.code, department: row.department },
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true, data: data || row }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  updateCompanyEmployeeInDB: async (empId, updates, userProfile = null) => {
    if (!supabase?.from || !empId) return { success: false }
    try {
      const row = {
        updated_at: new Date().toISOString(),
      }
      if (updates.name !== undefined) row.name = updates.name
      if (updates.phone !== undefined) row.phone = updates.phone
      if (updates.nationalId !== undefined || updates.national_id !== undefined) {
        row.national_id = updates.nationalId ?? updates.national_id
      }
      if (updates.department !== undefined) row.department = updates.department
      if (updates.jobTitle !== undefined || updates.job_title !== undefined) {
        row.job_title = updates.jobTitle ?? updates.job_title
      }
      if (updates.salaryType !== undefined || updates.salary_type !== undefined) {
        row.salary_type = updates.salaryType ?? updates.salary_type
      }
      if (updates.baseSalary !== undefined || updates.base_salary !== undefined) {
        row.base_salary = Number(updates.baseSalary ?? updates.base_salary ?? 0)
      }
      if (updates.dailyRate !== undefined || updates.daily_rate !== undefined) {
        row.daily_rate = Number(updates.dailyRate ?? updates.daily_rate ?? 0)
      }
      if (updates.status !== undefined) row.status = updates.status
      if (updates.notes !== undefined) row.notes = updates.notes

      const { data, error } = await supabase
        .from('ax_company_employees')
        .update(row)
        .eq('id', empId)
        .select()
        .single()
      if (error) throw error

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_company_employees',
          action: 'UPDATE_EMPLOYEE',
          record_id: empId,
          new_data: row,
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteCompanyEmployeeInDB: async (empId, userProfile = null, empFallback = null) => {
    if (!supabase?.from || !empId) return { success: false }
    try {
      let emp = empFallback
      if (!emp) {
        const { data } = await supabase.from('ax_company_employees').select('*').eq('id', empId).maybeSingle()
        if (data) emp = data
      }

      const { error } = await supabase.from('ax_company_employees').delete().eq('id', empId)
      if (error) throw error

      if (emp) {
        try {
          await AX_RecycleBinService.moveToRecycleBin({
            entityType: 'employee',
            entityId: empId,
            entityCode: emp.code || `EMP-${String(empId).slice(-4)}`,
            entityTitle: `موظف: ${emp.name} (${emp.job_title || emp.jobTitle || 'موظف'})`,
            originalData: emp,
            userProfile,
          })
        } catch {}
      }

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_company_employees',
          action: 'DELETE_EMPLOYEE',
          record_id: empId,
          new_data: { name: emp?.name },
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  fetchAttendanceByDateInDB: async (date) => {
    if (!supabase?.from || !date) return { success: false, data: [] }
    try {
      const { data, error } = await supabase
        .from('ax_employee_attendance')
        .select('*')
        .eq('date', date)
      if (error) throw error
      return { success: true, data: data || [] }
    } catch (err) {
      return { success: false, error: err.message, data: [] }
    }
  },

  fetchMonthlyAttendanceInDB: async (yearMonth) => {
    if (!supabase?.from || !yearMonth) return { success: false, data: [] }
    try {
      const { data, error } = await supabase
        .from('ax_employee_attendance')
        .select('*')
        .gte('date', `${yearMonth}-01`)
        .lte('date', `${yearMonth}-31`)
      if (error) throw error
      return { success: true, data: data || [] }
    } catch (err) {
      return { success: false, error: err.message, data: [] }
    }
  },

  saveAttendanceBatchInDB: async (records = [], userProfile = null) => {
    if (!supabase?.from || !Array.isArray(records) || records.length === 0) return { success: false }
    try {
      const rows = records.map((r) => ({
        id: r.id || `${r.date}_${r.employee_id || r.employeeId}`,
        date: r.date,
        employee_id: r.employee_id || r.employeeId,
        employee_name: r.employee_name || r.employeeName || '',
        status: r.status || 'present',
        deduction_days: Number(r.deduction_days ?? r.deductionDays ?? 0),
        daily_earned: Number(r.daily_earned ?? r.dailyEarned ?? 0),
        notes: r.notes || null,
        recorded_by: userProfile?.name || 'مدير النظام',
        updated_at: new Date().toISOString(),
      }))

      const { data, error } = await supabase
        .from('ax_employee_attendance')
        .upsert(rows, { onConflict: 'date,employee_id' })
        .select()

      if (error) throw error

      try {
        await supabase.from('ax_activity_logs').insert({
          id: generateUUID(),
          table_name: 'ax_employee_attendance',
          action: 'SAVE_ATTENDANCE_BATCH',
          record_id: records[0]?.date,
          new_data: { date: records[0]?.date, count: rows.length },
          user_id: userProfile?.id || null,
        })
      } catch {}

      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },
}
