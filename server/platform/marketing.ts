import type { CampaignRecord, CampaignAsset, ExportArtifact } from '../../shared/platform-contracts';
import type { MarginSimulationInput, MarginSimulationResult } from '../../shared/growth-contracts';
import { evaluateMarginContribution } from './marginGuardian';
import { Auth, type Principal } from './auth';
import { Commerce } from './commerce';
import { Work } from './work';
import { fields, fail, id, integer, list, now, object, PlatformStore, strings, text, date } from './store';
import { readAssetConsent } from './dispatchConsent';
import { ReconnectRevalidation } from './reconnectRevalidation';

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export class Marketing {
  constructor(readonly store:PlatformStore,readonly auth:Auth,readonly commerce:Commerce,readonly work:Work){}
  get(actor:Principal,campaignId:string){this.work.staff(actor);const record=this.store.require<CampaignRecord>('campaigns',campaignId);if(record.ownerId!==actor.user.id)this.auth.founder(actor);return record;}
  all(actor:Principal){this.work.staff(actor);return this.store.all<CampaignRecord>('campaigns').filter(c=>c.ownerId===actor.user.id||this.auth.has(actor,'founder'));}
  save(actor:Principal,raw:unknown,campaignId?:string){
    this.work.staff(actor);
    const input=object(raw);
    fields(input,campaignId?['expectedRevision','title','objective','copy','assets','productIds','catalogueVersion','scheduledAt','marginSimulation','founderOverride','observed']:['title','objective','copy','assets','productIds','catalogueVersion','scheduledAt','marginSimulation','founderOverride']);
    const existing=campaignId?this.get(actor,campaignId):null;
    // OFF-01 — revalidate-on-reconnect. Pemanggil yang menyambung semula
    // menghantar peta `observed`: nilai yang ia perhati SEBELUM menjadi
    // offline. Jika pelayan berubah sejak itu, laporkan medan yang bereka-berca
    // (bukan hanya "revision conflict") supaya klien tahu apa yang perlu
    // disemak semula. Tanpa `observed`, tingkah laku lama dikekalkan.
    if(existing&&input.observed!==undefined&&isPlainRecord(input.observed)){
      const revalidation=new ReconnectRevalidation(this.store,this.auth).revalidate(actor,{
        kind:'campaigns',
        recordId:campaignId!,
        expectedRevision:Number(input.expectedRevision),
        submitted:input.observed as Record<string,unknown>,
      });
      if(!revalidation.ok){
        fail(revalidation.code==='REVALIDATION_RECORD_NOT_FOUND'?'NOT_FOUND':revalidation.code,revalidation.code==='REVALIDATION_FORBIDDEN'?403:409,revalidation.message,{conflicts:revalidation.conflicts,serverRevision:revalidation.serverRevision});
      }
    }
    if(existing)this.store.revision(existing.revision,input.expectedRevision);
    const assets:CampaignAsset[]=list(input.assets??[],50).map(rawAsset=>{
      const a=object(rawAsset);
      fields(a,['id','name','rights','consent','evidenceId']);
      const evidenceId=a.evidenceId?text(a.evidenceId):undefined;
      if(evidenceId){const evidence=this.store.require<{entityId:string;ownerId:string}>('evidence',evidenceId);this.work.entity(actor,evidence.entityId);}
      return {id:a.id?text(a.id):id(),name:text(a.name,'Nama aset',200),rights:text(a.rights,'Hak penggunaan',2000),consent:text(a.consent,'Consent',2000),...(evidenceId?{evidenceId}:{})};
    });
    const productIds=strings(input.productIds??[]);
    if(integer(input.catalogueVersion)!==this.commerce.version())fail('REQUOTE_REQUIRED',409);
    for(const productId of productIds)if(!this.commerce.catalogue().some(p=>p.id===productId))fail('PRODUCT_UNAVAILABLE',409);

    let marginSimulation: MarginSimulationInput | undefined = existing?.marginSimulation;
    let marginResult: MarginSimulationResult | undefined = existing?.marginResult;
    if(input.marginSimulation !== undefined){
      if(input.marginSimulation === null){
        marginSimulation = undefined;
        marginResult = undefined;
      } else {
        const sim = object(input.marginSimulation);
        fields(sim, ['netSalesExTaxSen','cogsSen','packagingSen','paymentFeesSen','fulfilmentVariableCostSen','deliverySubsidySen','agentCommissionSen','rewardCostSen','expectedReturnLossSen','minimumContributionSen','minimumContributionMarginPct']);
        marginSimulation = {
          netSalesExTaxSen: integer(sim.netSalesExTaxSen, 'Jualan Kasar (Sen)', 0),
          cogsSen: integer(sim.cogsSen, 'COGS (Sen)', 0),
          packagingSen: integer(sim.packagingSen, 'Packaging (Sen)', 0),
          paymentFeesSen: integer(sim.paymentFeesSen, 'Payment Fees (Sen)', 0),
          fulfilmentVariableCostSen: integer(sim.fulfilmentVariableCostSen, 'Fulfilment Cost (Sen)', 0),
          deliverySubsidySen: integer(sim.deliverySubsidySen, 'Delivery Subsidy (Sen)', 0),
          agentCommissionSen: integer(sim.agentCommissionSen, 'Agent Commission (Sen)', 0),
          rewardCostSen: integer(sim.rewardCostSen, 'Reward Cost (Sen)', 0),
          expectedReturnLossSen: integer(sim.expectedReturnLossSen, 'Return Loss (Sen)', 0),
          minimumContributionSen: integer(sim.minimumContributionSen, 'Minimum Contribution (Sen)', 0),
          minimumContributionMarginPct: typeof sim.minimumContributionMarginPct === 'number' && Number.isFinite(sim.minimumContributionMarginPct)
            ? sim.minimumContributionMarginPct
            : fail('INVALID_INPUT', 400, 'Peratusan margin minimum tidak sah.'),
        };
        marginResult = evaluateMarginContribution(marginSimulation);
      }
    }

    let founderOverride: CampaignRecord['founderOverride'] = existing?.founderOverride;
    if(input.founderOverride !== undefined){
      if(input.founderOverride === null){
        founderOverride = undefined;
      } else {
        this.auth.founder(actor);
        const fo = object(input.founderOverride);
        fields(fo, ['approved', 'reason']);
        if(typeof fo.approved !== 'boolean') fail('INVALID_INPUT', 400, 'Founder override approved mesti boolean.');
        if(fo.approved){
          const reason = text(fo.reason, 'Alasan pengecualian pengasas', 1000, 3);
          founderOverride = {
            approved: true,
            reason,
            approvedBy: actor.user.id,
            approvedAt: now(),
          };
          this.store.audit(actor.user.id, 'campaign.founder_override', existing?.id ?? 'pending', (existing?.revision ?? 0) + 1);
        } else {
          founderOverride = undefined;
        }
      }
    }

    if(marginResult && marginResult.isContributionPass && !marginResult.isMarginPctPass && founderOverride?.approved){
      marginResult = { ...marginResult, reasonCode: 'EXCEPTION_OVERRIDE_REQUIRED' };
    }

    const record:CampaignRecord={
      id:existing?.id??id(),
      ownerId:existing?.ownerId??actor.user.id,
      title:text(input.title,'Tajuk',200),
      objective:text(input.objective,'Objektif',2000),
      copy:text(input.copy,'Caption',20000),
      assets,
      productIds,
      catalogueVersion:this.commerce.version(),
      status:'draft',
      revision:(existing?.revision??0)+1,
      createdAt:existing?.createdAt??now(),
      ...(input.scheduledAt?{scheduledAt:date(input.scheduledAt)}:{}),
      ...(marginSimulation?{marginSimulation}:{}),
      ...(marginResult?{marginResult}:{}),
      ...(founderOverride?{founderOverride}:{}),
    };
    if(existing)this.store.save('campaign_revisions',{...existing,id:`${existing.id}:${existing.revision}`,campaignId:existing.id});
    this.store.save('campaigns',record);
    this.store.audit(actor.user.id,'campaign.save',record.id,record.revision);
    return record;
  }
  approve(actor:Principal,campaignId:string,raw:unknown){
    this.auth.founder(actor);
    const input=object(raw);
    fields(input,['expectedRevision','approvalExpiresAt','founderOverride']);
    const record=this.get(actor,campaignId);
    this.store.revision(record.revision,input.expectedRevision);
    if(record.catalogueVersion!==this.commerce.version())fail('REQUOTE_REQUIRED',409);
    // NOTA PD-01: gate persetujuan aset ada pada laluan PENGLANTARAN
    // (`export`), bukan pada kelulusan. Kelulusan ialah tandatangan dalaman;
    // penghantaran/pek aset ialah bila persetujuan itu perlu di harden.
    const approvalExpiresAt=date(input.approvalExpiresAt);
    if(approvalExpiresAt<=now()||Date.parse(approvalExpiresAt)>Date.now()+90*24*3600_000)fail('INVALID_EXPIRY');

    let founderOverride = record.founderOverride;
    if(input.founderOverride !== undefined){
      if(input.founderOverride === null){
        founderOverride = undefined;
      } else {
        const fo = object(input.founderOverride);
        fields(fo, ['approved', 'reason']);
        if(typeof fo.approved !== 'boolean') fail('INVALID_INPUT', 400, 'Founder override approved mesti boolean.');
        if(fo.approved){
          const reason = text(fo.reason, 'Alasan pengecualian pengasas', 1000, 3);
          founderOverride = {
            approved: true,
            reason,
            approvedBy: actor.user.id,
            approvedAt: now(),
          };
          this.store.audit(actor.user.id, 'campaign.founder_override', campaignId, record.revision + 1);
        } else {
          founderOverride = undefined;
        }
      }
    }

    if(record.marginResult){
      if(!record.marginResult.isContributionPass){
        fail('INSUFFICIENT_CASH_MARGIN', 409, 'Kelulusan disekat: Sumbangan margin tunai gagal.');
      }
      if(!record.marginResult.isMarginPctPass && !founderOverride?.approved){
        fail('FOUNDER_OVERRIDE_REQUIRED', 409, 'Kelulusan disekat (FIN-01): Peratusan margin gagal, memerlukan kelulusan pengecualian Founder Override.');
      }
    }

    const updated:CampaignRecord={
      ...record,
      status:record.scheduledAt?'planned' as const:'approved' as const,
      approvedBy:actor.user.id,
      approvalExpiresAt,
      revision:record.revision+1,
      ...(founderOverride?{founderOverride}:{}),
    };
    this.store.save('campaigns',updated);
    this.store.audit(actor.user.id,'campaign.approve',campaignId,updated.revision);
    return updated;
  }
  /**
   * PD-01 — setiap aset yang akaniaran/dihantar mesti ada rekod persetujuan
   * BERSTRUKTUR yang berstatus `granted`. Teks bebas `asset.consent` yang lama
   * ialah `unknown`, bukan persetujuan — jadi ia tidak melepasi gate ini.
   */
  private assertAssetsConsented(record:CampaignRecord){
    for(const asset of record.assets){
      const consent=readAssetConsent(this.store,asset.id);
      if(!consent||consent.state!=='granted'){
        fail('ASSET_CONSENT_NOT_GRANTED',409,`Aset ${asset.id} tiada persetujuan yang granted.`);
      }
    }
  }
  export(actor:Principal,campaignId:string,raw:unknown,key:unknown){const record=this.get(actor,campaignId);return this.commerce.idem(actor,`campaign.export:${campaignId}`,key,raw,()=>{const input=object(raw);fields(input,['expectedRevision','format']);this.store.revision(record.revision,input.expectedRevision);if(!['approved','planned'].includes(record.status)||!record.approvalExpiresAt||record.approvalExpiresAt<=now())fail('APPROVAL_REQUIRED',409);if(record.catalogueVersion!==this.commerce.version())fail('APPROVAL_STALE',409);if(input.format!=='text'&&input.format!=='asset_bundle')fail('INVALID_EXPORT_FORMAT');this.assertAssetsConsented(record);const fileRefs=input.format==='asset_bundle'?record.assets.map(asset=>{if(!asset.evidenceId)fail('ASSET_FILE_REQUIRED',409);const evidence=this.store.require<{id:string;kind:string}>('evidence',asset.evidenceId);if(evidence.kind!=='file')fail('ASSET_FILE_REQUIRED',409);return evidence.id;}):[];const artifact:ExportArtifact={id:id(),campaignRevision:record.revision,format:input.format,fileRefs,status:'exported',content:record.copy};this.store.save('exports',{...artifact,campaignId});this.store.audit(actor.user.id,'campaign.export',campaignId,record.revision);return artifact;});}
}
