import { fail, object, fields, list, oneOf } from './store';
import { Auth, type Principal } from './auth';
import { boundedBody } from './evidenceFiles';

/** Existing credential adapter stays disabled until an operator explicitly enables it. */
export async function generateLegacyContent(auth:Auth,actor:Principal,path:string,input:unknown):Promise<unknown>{
  auth.founder(actor);
  if(process.env.PLATFORM_ENABLE_LEGACY_AI!=='true')fail('LEGACY_AI_DISABLED',409,'Integrasi AI legacy belum diaktifkan. Workflow manual tersedia.');
  const apiKey=process.env.GEMINI_API_KEY;
  if(!apiKey)fail('LEGACY_AI_UNCONFIGURED',409);
  const match=/^\/legacy-ai\/v1beta\/models\/(gemini-[a-zA-Z0-9._-]{1,100}):generateContent$/.exec(path);
  if(!match)fail('MODEL_NOT_ALLOWED',400);
  const body=object(input);fields(body,['contents','systemInstruction','generationConfig','safetySettings']);
  if(!list(body.contents,100).length)fail('INVALID_AI_CONTENT');
  auth.store.rate(`legacy-ai:${actor.user.id}`,6);
  let response:Response;
  try{response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(match[1])}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify(body),signal:AbortSignal.timeout(20_000)});}catch{fail('AI_PROVIDER_UNAVAILABLE',502,'Penyedia AI tidak tersedia.');}
  if(!response.ok)fail(response.status===429?'AI_QUOTA_UNAVAILABLE':'AI_PROVIDER_REJECTED',502,'Permintaan AI tidak dapat diproses oleh penyedia.');
  const raw=new TextDecoder().decode(await boundedBody(response,1024*1024,20000));
  let output:unknown;try{output=JSON.parse(raw);}catch{fail('AI_OUTPUT_INVALID',502);}
  const record=object(output);if(!Array.isArray(record.candidates))fail('AI_OUTPUT_INVALID',502);
  auth.store.audit(actor.user.id,'legacy_ai.generate',match[1]);
  // Respons provider mentah TIDAK dihantar ke pelayar. Hanya medan yang
  // diperlukan oleh UI (SDK `@google/genai` melalui `src/services/geminiClient.ts`)
  // diproyeksikan keluar.
  return projectLegacyAiResponse(record);
}

function asRecord(value:unknown):Record<string,unknown>|undefined{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:undefined;
}

/**
 * Projeksi respons `generateContent` kepada medan yang diperlukan UI sahaja:
 * `candidates[].content.parts[].text`, `finishReason`, `index`, `usageMetadata`,
 * `modelVersion` dan `responseId`. Mana-mana medan lain dalam respons provider
 * (safety feedback, citation, token detail tambahan dan seumpanya) dibuang
 * sebelum dihantar ke pelayar.
 */
export function projectLegacyAiResponse(record:Record<string,unknown>):Record<string,unknown>{
  const candidates=Array.isArray(record.candidates)?record.candidates.map(candidate=>{
    const source=asRecord(candidate)??{};
    const content=asRecord(source.content);
    const parts=content&&Array.isArray(content.parts)
      ?content.parts.map(part=>{
          const text=asRecord(part)?.text;
          return {text:typeof text==='string'?text:''};
        })
      :[];
    const projected:Record<string,unknown>={content:{parts}};
    if(typeof source.index==='number')projected.index=source.index;
    if(typeof source.finishReason==='string')projected.finishReason=source.finishReason;
    return projected;
  }):[];
  const projected:Record<string,unknown>={candidates};
  const usage=asRecord(record.usageMetadata);
  if(usage)projected.usageMetadata=usage;
  if(typeof record.modelVersion==='string')projected.modelVersion=record.modelVersion;
  if(typeof record.responseId==='string')projected.responseId=record.responseId;
  return projected;
}
