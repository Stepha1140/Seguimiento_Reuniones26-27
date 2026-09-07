import { supabase } from "../supabase.js";
const clean=v=>String(v??"").trim();
const key=v=>clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
export async function findPossibleBeneficiary({numero_documento,telefono,nombre_completo}){
 if(clean(numero_documento)){const {data}=await supabase.from("beneficiarios").select("*").eq("numero_documento",clean(numero_documento)).maybeSingle();if(data)return{match:data,confidence:"Alta",by:"documento"}}
 if(clean(telefono)){const {data}=await supabase.from("beneficiarios").select("*").eq("telefono",clean(telefono)).maybeSingle();if(data)return{match:data,confidence:"Media",by:"teléfono"}}
 const {data=[]}=await supabase.from("beneficiarios").select("*");
 const match=data.find(x=>key(x.nombre_completo)===key(nombre_completo));return match?{match,confidence:"Posible",by:"nombre"}:null;
}
export async function upsertBeneficiary(payload){const existing=await findPossibleBeneficiary(payload);if(existing?.confidence==="Alta")return supabase.from("beneficiarios").update({...payload,updated_at:new Date().toISOString()}).eq("id",existing.match.id).select().single();return supabase.from("beneficiarios").insert(payload).select().single()}
export function maskDocument(v){const x=clean(v);return x.length<6?"***":`${x.slice(0,3)}***${x.slice(-3)}`}
export function maskPhone(v){const x=clean(v);return x.length<7?"***":`${x.slice(0,3)} *** ${x.slice(-4)}`}

