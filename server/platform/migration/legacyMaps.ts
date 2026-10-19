import type { FulfilmentStatus, OrderLine, OrderRecord, PaymentState } from '../../../shared/platform-contracts';

export interface LegacySupabaseOrder {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email?: string;
  city: string;
  items: string;
  amount: number;
  status: 'Processing' | 'Delivered' | 'Delayed' | 'Refunded' | 'Cancelled';
  refund_reason?: string;
  created_at: string;
  delivered_date?: string;
}

export interface MappedOrderResult {
  valid: boolean;
  order?: OrderRecord;
  rejectionReason?: string;
  sourceId: string;
}

export function mapLegacyStatus(status: LegacySupabaseOrder['status']): {
  fulfilmentStatus: FulfilmentStatus;
  paymentState: PaymentState;
} {
  switch (status) {
    case 'Delivered':
      return { fulfilmentStatus: 'received', paymentState: 'pending' };
    case 'Processing':
      return { fulfilmentStatus: 'accepted', paymentState: 'pending' };
    case 'Delayed':
      return { fulfilmentStatus: 'packing', paymentState: 'pending' };
    case 'Refunded':
      return { fulfilmentStatus: 'cancelled', paymentState: 'pending' };
    case 'Cancelled':
      return { fulfilmentStatus: 'cancelled', paymentState: 'pending' };
    default:
      return { fulfilmentStatus: 'review', paymentState: 'pending' };
  }
}

/** Allocate known order value by unit; source unit prices remain unknown. */
export function parseLegacyItems(itemsRaw:string,amountSen:number):OrderLine[]{
  const parts=itemsRaw.split(',').map(part=>part.trim()).filter(Boolean);
  const parsed=(parts.length?parts:['Legacy item (description unknown)']).map(part=>{
    const match=part.match(/^(.*?)(?:\s*\((\d+)\))?$/);
    const quantity=match?.[2]?Number(match[2]):1;
    if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1_000_000)throw new Error('Kuantiti item legacy tidak sah');
    return {name:match?.[1]?.trim()||'Legacy item (description unknown)',quantity};
  });
  const units=parsed.reduce((sum,item)=>sum+item.quantity,0),unitPrice=Math.floor(amountSen/units);
  let remaining=amountSen%units;
  return parsed.flatMap(item=>{
    const extra=Math.min(remaining,item.quantity);remaining-=extra;
    const line={productId:'legacy-imported-sku',name:item.name,publishedVersion:0};
    return [...(extra?[{...line,quantity:extra,priceSen:unitPrice+1}]:[]),...(item.quantity>extra?[{...line,quantity:item.quantity-extra,priceSen:unitPrice}]:[])];
  });
}
export function mapSupabaseOrderToPlatform(
  row: unknown,
  existingOrderIds: Set<string>,
): MappedOrderResult {
  if (!row || typeof row !== 'object') {
    return { valid: false, rejectionReason: 'Row bukan objek', sourceId: 'unknown' };
  }

  const r = row as Partial<LegacySupabaseOrder>;
  const sourceId = typeof r.order_id==='string'?r.order_id:typeof r.id==='string'?r.id:'unknown';

  if (typeof r.id!=='string'||!r.id.trim()||typeof r.order_id!=='string'||!r.order_id.trim()) {
    return { valid: false, rejectionReason: 'ID atau order_id tiada', sourceId };
  }

  if((r.items!==undefined&&typeof r.items!=='string')||(r.customer_name!==undefined&&typeof r.customer_name!=='string')||(r.city!==undefined&&typeof r.city!=='string'))return {valid:false,rejectionReason:'Medan teks legacy tidak sah',sourceId};
  if(typeof r.created_at!=='string'||!Number.isFinite(Date.parse(r.created_at)))return {valid:false,rejectionReason:'Tarikh sumber diperlukan untuk provenance',sourceId};

  if (existingOrderIds.has(r.order_id)) {
    return { valid: false, rejectionReason: `Pesanan pendua dikesan (${r.order_id})`, sourceId };
  }

  if (typeof r.amount !== 'number' || !Number.isFinite(r.amount) || r.amount < 0) {
    return { valid: false, rejectionReason: 'Amaun pesanan tidak sah', sourceId };
  }

  const amountSen = Math.round(r.amount * 100);
  if(!Number.isSafeInteger(amountSen))return {valid:false,rejectionReason:'Amaun terlalu besar',sourceId};
  const { fulfilmentStatus, paymentState } = mapLegacyStatus(r.status || 'Processing');
  const createdAt = r.created_at;
  let lines:OrderLine[];
  try{lines=parseLegacyItems(r.items||'',amountSen);}catch{return {valid:false,rejectionReason:'Kuantiti item legacy tidak sah',sourceId};}

  // Map to distinct legacy customer identity (never forge verified credentials or sessions)
  const customerId = `legacy-cust-${sourceId.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  const order: OrderRecord & {importProvenance:Record<string,unknown>} = {
    importProvenance:{source:'legacy-supabase',sourceId:r.id,sourceOrderId:r.order_id,sourceStatus:r.status??'unknown',sourceItems:r.items??null,sourceCreatedAt:r.created_at??null,paymentVerified:false,linePrices:'allocated-estimate',unknowns:['payment verification','source unit prices','catalogue SKU mapping']},
    id: `LEGACY-${r.order_id}`,
    customerId,
    lines,
    amountSen,
    fulfilment: 'delivery',
    contactRef: `[LEGACY_IMPORT] ${r.customer_name || 'Pelanggan Legacy'} - ${r.city || 'Malaysia'}`,
    outletId: 'hq',
    fulfilmentStatus,
    revision: 1,
    paymentState,
    paidAmountSen: paymentState === 'verified' ? amountSen : 0,
    refundAmountSen: paymentState === 'refunded' ? amountSen : 0,
    createdAt,
    updatedAt: r.delivered_date && !isNaN(Date.parse(r.delivered_date)) ? r.delivered_date : createdAt,
  };

  return { valid: true, order, sourceId };
}
