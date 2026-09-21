import { EditionPage } from "@/components/edition-page";
export { generateMetadata } from "@/components/edition-page";
export const dynamic = "force-dynamic";
export default function IssuePage(props: { params: Promise<{ date: string }> }) { return <EditionPage {...props} />; }
