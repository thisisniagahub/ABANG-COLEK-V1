import { fail } from './store';
export interface GoogleIdentity { issuer:string; subject:string; email:string; name:string }
export type GoogleIdentityVerifier = (accessToken:string)=>Promise<GoogleIdentity>;
/** Trust the configured project's verified user endpoint, never decoded browser JWT claims. */
export function createGoogleIdentityVerifier(url:string,serverKey:string,fetcher:(input:URL,init?:RequestInit)=>Promise<Response>=fetch):GoogleIdentityVerifier {
  const base=new URL(url);if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw new Error('Invalid identity endpoint configuration.');
  return async accessToken=>{
    if(typeof accessToken!=='string'||!accessToken||accessToken.length>16000||/\s/.test(accessToken))return fail('GOOGLE_IDENTITY_INVALID',401);
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
    try {
      const response=await fetcher(new URL('/auth/v1/user',base),{headers:{apikey:serverKey,Authorization:`Bearer ${accessToken}`},signal:controller.signal,redirect:'error'});
      if(!response.ok)return fail('GOOGLE_IDENTITY_INVALID',401,'Identiti Google tidak dapat disahkan.');
      const reader=response.body?.getReader();if(!reader)return fail('GOOGLE_IDENTITY_INVALID',401);
      const chunks:Uint8Array[]=[];let size=0;while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>65536){await reader.cancel();return fail('GOOGLE_IDENTITY_INVALID',401);}chunks.push(next.value);}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
      const user=JSON.parse(new TextDecoder().decode(bytes)) as Record<string,unknown>;
      if(typeof user.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(user.id)||typeof user.email!=='string'||!/^[^\s@\0]+@[^\s@\0]+\.[^\s@\0]+$/.test(user.email)||user.email.length>254||typeof user.email_confirmed_at!=='string'||!Number.isFinite(Date.parse(user.email_confirmed_at))||!Array.isArray(user.identities)||!user.identities.some((identity:unknown)=>!!identity&&typeof identity==='object'&&'provider' in identity&&identity.provider==='google'))return fail('GOOGLE_IDENTITY_INVALID',401,'Email Google yang disahkan diperlukan.');
      const metadata=user.user_metadata as Record<string,unknown>|undefined;
      return {issuer:`${base.origin}/auth/v1`,subject:user.id,email:user.email.toLowerCase(),name:typeof metadata?.full_name==='string'?metadata.full_name.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,100).trim()||'Customer':'Customer'};
    }catch(error){if(error instanceof Error&&'code' in error)throw error;return fail('GOOGLE_IDENTITY_UNAVAILABLE',503,'Pengesahan Google tergendala. Cuba semula.');}finally{clearTimeout(timer);}
  };
}
