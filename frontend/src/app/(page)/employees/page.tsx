import LoginRequired from "@/components/auth/LoginRequired";
import EmployeesPage from "@/features/employees/EmployeesPage";

export default function Page() {
  return <LoginRequired what="danh bạ nhân viên"><EmployeesPage /></LoginRequired>;
}
