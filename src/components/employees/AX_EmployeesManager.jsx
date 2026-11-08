import React, { useState, useEffect, useMemo } from 'react'
import {
  Users,
  CalendarCheck,
  DollarSign,
  UserPlus,
  Clock,
  Layers,
} from 'lucide-react'
import { useAXStore } from '../../store/useAXStore'
import { AX_EmployeesDirectory } from './AX_EmployeesDirectory'
import { AX_EmployeeAttendanceSheet } from './AX_EmployeeAttendanceSheet'
import { AX_EmployeePayrollLedger } from './AX_EmployeePayrollLedger'
import { AX_AddEmployeeModal } from './AX_AddEmployeeModal'
import { axToast } from '../common/AX_Toast'
import {
  getStoredEmployeeDeductions,
  getStoredPayrollSettlements,
} from '../../store/employeeHelpers'

export function AX_EmployeesManager() {
  const [activeTab, setActiveTab] = useState('attendance')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [employeeToEdit, setEmployeeToEdit] = useState(null)
  const [deductionsVersion, setDeductionsVersion] = useState(0)
  const [settlementsVersion, setSettlementsVersion] = useState(0)

  const companyEmployees = useAXStore((s) => s.companyEmployees || [])
  const employeeAttendance = useAXStore((s) => s.employeeAttendance || [])
  const cashTransactions = useAXStore((s) => s.cashTransactions || [])
  const treasuryAccounts = useAXStore((s) => s.treasuryAccounts || [])
  const addCompanyEmployee = useAXStore((s) => s.addCompanyEmployee)
  const updateCompanyEmployee = useAXStore((s) => s.updateCompanyEmployee)
  const deleteCompanyEmployee = useAXStore((s) => s.deleteCompanyEmployee)
  const saveEmployeeAttendance = useAXStore((s) => s.saveEmployeeAttendance)
  const loadCompanyEmployees = useAXStore((s) => s.loadCompanyEmployees)
  const addCashTransaction = useAXStore((s) => s.addCashTransaction)

  const directDeductions = useMemo(() => getStoredEmployeeDeductions(), [deductionsVersion])
  const payrollSettlements = useMemo(() => getStoredPayrollSettlements(), [settlementsVersion])

  useEffect(() => {
    if (loadCompanyEmployees) {
      loadCompanyEmployees()
    }
  }, [loadCompanyEmployees])

  const handleSaveEmployee = async (payload) => {
    if (employeeToEdit) {
      await updateCompanyEmployee(employeeToEdit.id, payload)
    } else {
      await addCompanyEmployee(payload)
    }
  }

  const handleEditEmployee = (emp) => {
    setEmployeeToEdit(emp)
    setIsAddModalOpen(true)
  }

  const handleOpenAddModal = () => {
    setEmployeeToEdit(null)
    setIsAddModalOpen(true)
  }

  const handlePaySalary = async (tx) => {
    if (addCashTransaction) {
      addCashTransaction(tx)
    }
  }

  const handleSaveAdvance = async (tx) => {
    if (addCashTransaction) {
      addCashTransaction(tx)
    }
  }

  const handleSaveDeduction = async () => {
    setDeductionsVersion((v) => v + 1)
  }

  const handleConfirmSettlement = async (settlementRecord, payoutTx) => {
    if (payoutTx && addCashTransaction) {
      addCashTransaction(payoutTx)
    }
    setSettlementsVersion((v) => v + 1)
  }

  return (
    <div className="w-full space-y-3.5 pb-20 lg:pb-6 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface-lowest border border-outline-variant/30 rounded-3xl p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-on-surface">شؤون الموظفين والعمال</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="md:hidden inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-xs shrink-0 cursor-pointer active:scale-95 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>إضافة موظف</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end overflow-hidden">
          <div className="w-full sm:w-auto overflow-x-auto no-scrollbar scroll-smooth flex items-center p-1 rounded-full bg-surface-low border border-outline-variant/30 gap-1 shrink">
            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'attendance'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-lowest'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>سجل الحضور واليومية</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('directory')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'directory'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-lowest'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>دليل الموظفين</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
                {companyEmployees.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('payroll')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'payroll'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-lowest'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>مسير الرواتب</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-xs shrink-0 cursor-pointer active:scale-95 transition-all"
            title="إضافة موظف جديد"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة موظف</span>
          </button>
        </div>
      </div>

      {activeTab === 'attendance' && (
        <AX_EmployeeAttendanceSheet
          employees={companyEmployees}
          employeeAttendance={employeeAttendance}
          onSaveAttendance={saveEmployeeAttendance}
        />
      )}

      {activeTab === 'directory' && (
        <AX_EmployeesDirectory
          employees={companyEmployees}
          attendanceRecords={employeeAttendance}
          cashTransactions={cashTransactions}
          treasuryAccounts={treasuryAccounts}
          directDeductions={directDeductions}
          payrollSettlements={payrollSettlements}
          onAddEmployee={handleOpenAddModal}
          onEditEmployee={handleEditEmployee}
          onDeleteEmployee={deleteCompanyEmployee}
          onSaveDeduction={handleSaveDeduction}
          onSaveAdvance={handleSaveAdvance}
        />
      )}

      {activeTab === 'payroll' && (
        <AX_EmployeePayrollLedger
          employees={companyEmployees}
          employeeAttendance={employeeAttendance}
          cashTransactions={cashTransactions}
          treasuryAccounts={treasuryAccounts}
          directDeductions={directDeductions}
          payrollSettlements={payrollSettlements}
          onPaySalary={handlePaySalary}
          onConfirmSettlement={handleConfirmSettlement}
        />
      )}

      <button
        type="button"
        onClick={handleOpenAddModal}
        className="fixed bottom-24 lg:bottom-6 left-6 z-30 flex items-center gap-2 px-5 py-3 rounded-full bg-primary hover:bg-primary-dark text-white font-black text-xs sm:text-sm shadow-level3 active:scale-95 transition-all cursor-pointer"
        title="إضافة موظف جديد"
      >
        <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
        <span>إضافة موظف</span>
      </button>

      {isAddModalOpen && (
        <AX_AddEmployeeModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false)
            setEmployeeToEdit(null)
          }}
          onSave={handleSaveEmployee}
          employeeToEdit={employeeToEdit}
        />
      )}
    </div>
  )
}

export default AX_EmployeesManager
