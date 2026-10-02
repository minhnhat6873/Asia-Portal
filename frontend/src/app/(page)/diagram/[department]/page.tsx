import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DepartmentDiagramPage from "@/features/diagram/DepartmentDiagramPage";
import {
  DIAGRAM_DEPARTMENTS,
  findDiagramDepartment,
} from "@/config/diagramDepartments";

type DepartmentPageProps = {
  params: Promise<{ department: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return DIAGRAM_DEPARTMENTS.map((department) => ({ department: department.slug }));
}

export async function generateMetadata({ params }: DepartmentPageProps): Promise<Metadata> {
  const { department: slug } = await params;
  const department = findDiagramDepartment(slug);

  return {
    title: department ? `${department.name} · Asia Food & Beverage` : "Phòng ban · Asia Food & Beverage",
  };
}

export default async function DepartmentPage({ params }: DepartmentPageProps) {
  const { department: slug } = await params;
  const department = findDiagramDepartment(slug);

  if (!department) notFound();

  return <DepartmentDiagramPage department={department.name} employeeDepartments={department.employeeDepartments} />;
}
