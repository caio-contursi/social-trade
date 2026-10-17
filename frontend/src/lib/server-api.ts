import "server-only";
import type { Project } from "@/lib/types";

const apiOrigin=(process.env.SOCIALTRADE_API_URL||"http://127.0.0.1:8000").replace(/\/$/,"");
export async function publicProjects():Promise<{projects:Project[];error:boolean}>{
  try{const response=await fetch(`${apiOrigin}/api/public/projects`,{cache:"no-store",signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error("API indisponível");return {projects:await response.json(),error:false};}catch{return {projects:[],error:true};}
}
export async function publicProject(slug:string):Promise<{project:Project|null;error:boolean}>{
  try{const response=await fetch(`${apiOrigin}/api/public/organizations/${encodeURIComponent(slug)}`,{cache:"no-store",signal:AbortSignal.timeout(8000)});if(response.status===404)return {project:null,error:false};if(!response.ok)throw new Error("API indisponível");return {project:await response.json(),error:false};}catch{return {project:null,error:true};}
}
