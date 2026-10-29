"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/browser-auth";
import { captureLinkSchema, readingLinkUpdateSchema, readingUrlSchema, type ReadingLink } from "@/lib/reading";
import * as store from "@/lib/reading-store";
import { processReadingMetadata } from "@/lib/reading-metadata";
import { setSharedArticleReadByUrl, markSharedArticlesRead } from "@/lib/social-store";

function refresh() { revalidatePath("/links"); revalidatePath("/issues/[date]","page"); }
const expired={error:"Your session has ended. Sign in again to save your changes."};

export async function addReadingLink(input: {url:string;title?:string}): Promise<{link?:ReadingLink;created?:boolean;error?:string}> {
  const user=await getUser(); if(!user)return expired;
  const parsed=captureLinkSchema.safeParse(input);
  if(!parsed.success)return {error:"Enter a complete HTTP or HTTPS link. A title is optional."};
  try {
    const result=await store.captureReadingLink(user.subject,parsed.data);
    after(()=>processReadingMetadata(user.subject));
    refresh();return result;
  }catch{return {error:"The link could not be saved. Please try again."};}
}

export async function changeReadingLink(input: z.infer<typeof readingLinkUpdateSchema>): Promise<{link?:ReadingLink;error?:string}> {
  const user=await getUser(); if(!user)return expired;
  const parsed=readingLinkUpdateSchema.safeParse(input);
  if(!parsed.success)return {error:"Please choose a valid link and change."};
  try {
    const link=await store.changeReadingLink(user.subject,parsed.data);
    if(parsed.data.read!==undefined)await setSharedArticleReadByUrl(user.subject,{url:parsed.data.url,read:parsed.data.read});
    refresh();return {link};
  }catch{return {error:"Your change could not be saved. Please try again."};}
}

export async function recordReadingStage(input:{date:string;stage:"front"|"inside";revision:string}):Promise<{error?:string}> {
  const user=await getUser(); if(!user)return expired;
  const parsed=z.object({date:z.string(),stage:z.enum(["front","inside"]),revision:z.string().regex(/^[a-f0-9]{64}$/)}).strict().safeParse(input);
  if(!parsed.success)return {error:"This page could not be opened."};
  try{await store.recordReadingStage(user.subject,parsed.data.date,parsed.data.stage,parsed.data.revision);return {};}
  catch{return {error:"This edition could not be opened. Try opening your latest paper."};}
}

export async function importReadingMarks(input:{urls:string[]}):Promise<{error?:string}> {
  const user=await getUser();if(!user)return expired;
  const parsed=z.object({urls:z.array(readingUrlSchema).max(1000)}).strict().safeParse(input);
  if(!parsed.success)return {error:"Reading history could not be imported."};
  try{
    await store.importReadingMarks(user.subject,parsed.data.urls);
    await markSharedArticlesRead(user.subject,parsed.data.urls);
    refresh();return {};
  }catch{return {error:"Reading history could not be imported. We’ll try again next time."};}
}

export async function retryReadingMetadata(input:{url:string}):Promise<{error?:string}> {
  const user=await getUser();if(!user)return expired;
  const parsed=z.object({url:readingUrlSchema}).strict().safeParse(input);
  if(!parsed.success)return {error:"Please choose a valid link."};
  try{
    const queued=await store.retryReadingMetadata(user.subject,parsed.data.url);
    if(!queued)return {error:"Please wait a minute before trying the article lookup again."};
    after(()=>processReadingMetadata(user.subject));refresh();return {};
  }catch{return {error:"Could not retry this link. Please try again."};}
}
