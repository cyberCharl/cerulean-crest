import { after } from "next/server";
import { getUser } from "@/lib/browser-auth";
import { listReadingLinks } from "@/lib/reading-store";
import { processReadingMetadata } from "@/lib/reading-metadata";

export const dynamic="force-dynamic";
export const maxDuration=60;
export async function GET() {
  const user=await getUser();
  const headers={"Cache-Control":"private, no-store"};
  if(!user)return Response.json({error:"Sign in to view your links."},{status:401,headers});
  const links=await listReadingLinks(user.subject);
  if(links.some(link=>["pending","fetching"].includes(link.metadataStatus)))after(()=>processReadingMetadata(user.subject));
  return Response.json({links},{headers});
}
