import DepartmentDiagramPage from "@/features/diagram/DepartmentDiagramPage";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ department: "truyen-thong" }];
}

export default DepartmentDiagramPage;
