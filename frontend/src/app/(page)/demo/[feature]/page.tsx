import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEMO_FEATURES, findDemoFeature } from "@/config/demoFeatures";
import DemoScreen from "../DemoScreen";

type Props = {
  params: Promise<{ feature: string }>;
};

/** The site is exported statically, so every shortcut URL is pre-rendered. */
export function generateStaticParams() {
  return DEMO_FEATURES.map((entry) => ({ feature: entry.slug }));
}

/** Unknown slugs must not be generated at all. */
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { feature: slug } = await params;
  const feature = findDemoFeature(slug);

  if (!feature) {
    return { title: "Bản thử nghiệm · Asia Internal Portal" };
  }

  return {
    title: `${feature.label} · Bản thử nghiệm`,
    description: `${feature.label} đang trong bản thử nghiệm. Vui lòng quay trở lại sau.`,
  };
}

export default async function DemoFeaturePage({ params }: Props) {
  const { feature: slug } = await params;
  const feature = findDemoFeature(slug);

  if (!feature) {
    notFound();
  }

  return <DemoScreen feature={feature} />;
}
