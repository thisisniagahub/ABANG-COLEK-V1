import {boundedBody} from './evidenceFiles';
import {DomainError} from './store';

/** Bound cloud responses before the hosting platform replaces them with an opaque error. */
export async function boundHostedResponse(response:Response,maximum=4_000_000,timeoutMs=10_000):Promise<Response>{
  if(!response.body)return response;
  const contentType = response.headers.get('content-type') || '';
  if(contentType.includes('text/event-stream')) return response;
  try{
    const bytes=await boundedBody(response,maximum,timeoutMs);
    return new Response(bytes as BodyInit,{status:response.status,statusText:response.statusText,headers:response.headers});
  }catch(error){
    const oversized=error instanceof DomainError&&error.status===413;
    return Response.json({ok:false,code:oversized?'HOSTED_DOWNLOAD_TOO_LARGE':'HOSTED_DOWNLOAD_UNAVAILABLE',message:oversized?'Fail melebihi had muat turun 4 MB. Pilih eksport teks atau fail yang lebih kecil.':'Muat turun tidak dapat disiapkan. Cuba semula.'},{status:oversized?413:504,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
}
