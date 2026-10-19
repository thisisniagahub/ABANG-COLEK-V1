import type {
  ProductOnboardingDraft,
  LocationOnboardingDraft,
  DealerTermsDraft,
  OnboardingValidationResult,
  OnboardingCommitResult,
} from '../../shared/onboarding-contracts';
import type { BusinessSettings, CatalogueProduct, StockLot, InventoryMovement } from '../../shared/platform-contracts';
import { Auth, hash, type Principal } from './auth';
import { Commerce } from './commerce';
import { fail, fields, integer, list, object, oneOf, date, strings, text, id, now, PlatformStore } from './store';

/** Object property ordering is not a distinct onboarding command. */
function canonicalPacket(value:unknown):unknown {
  if(Array.isArray(value))return value.map(canonicalPacket);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([left],[right])=>left.localeCompare(right)).map(([key,item])=>[key,canonicalPacket(item)]));
  return value;
}
export class BusinessOnboarding {
  constructor(
    readonly store: PlatformStore,
    readonly auth: Auth,
    readonly commerce: Commerce,
  ) {}

  private assertPacket(raw: unknown): void {
    const packet=object(raw);fields(packet,['products','locations','dealerTerms','expectedSettingsVersion']);
    const skus=new Set<string>();
    for(const value of list(packet.products??[],500)){
      const product=object(value);fields(product,['sku','name','packSize','unitName','priceSen','description','lifecycle','provenanceRights','ownerApproved','unverifiedFields','isArtworkOrMascot']);
      text(product.name,'Nama produk',120,0);integer(product.packSize,'Saiz pek',1,10000);
      if(product.priceSen!==undefined)integer(product.priceSen,'Harga',1,100_000_000);
      if(typeof product.ownerApproved!=='boolean'||(product.isArtworkOrMascot!==undefined&&typeof product.isArtworkOrMascot!=='boolean'))fail('INVALID_INPUT');
      oneOf(product.lifecycle,['draft','pending_approval','published','retired'] as const);
      if(product.description!==undefined)text(product.description,'Penerangan',3000,0);
      if(product.unitName!==undefined)text(product.unitName,'Unit',100);
      if(product.provenanceRights!==undefined)text(product.provenanceRights,'Hak',2000,0);
      if(product.unverifiedFields!==undefined)strings(product.unverifiedFields,100);
      if(product.sku!==undefined){const sku=text(product.sku,'SKU',100).toLowerCase();if(!/^[a-z0-9_-]+$/.test(sku)||skus.has(sku))fail('INVALID_SKU');skus.add(sku);}
    }
    const locations=new Set<string>();
    for(const value of list(packet.locations??[],100)){
      const location=object(value);fields(location,['id','name','address','openingStockQuantity','batchId','approved','hours','verifiedAt']);
      if(location.approved!==undefined&&typeof location.approved!=='boolean')fail('INVALID_INPUT');
      if(location.approved===true){text(location.address,'Alamat',2000);text(location.hours,'Waktu operasi',1000);date(location.verifiedAt);}
      const locationId=text(location.id,'ID lokasi',120);if(locations.has(locationId))fail('DUPLICATE_LOCATION');locations.add(locationId);
      text(location.name,'Lokasi',200);text(location.address,'Alamat',2000,0);
      if(location.openingStockQuantity!==undefined)integer(location.openingStockQuantity,'Stok awal',0,1_000_000);
      if(location.batchId!==undefined)text(location.batchId,'Batch',120);
    }
    if(packet.dealerTerms!==undefined){const terms=object(packet.dealerTerms);fields(terms,['minimumQuantity','packMultiple','priceBasisPoints','ownership','returnRules','approved']);integer(terms.minimumQuantity,'Minimum',1,1_000_000);integer(terms.packMultiple,'Pek',1,10000);integer(terms.priceBasisPoints,'Basis points',1,10000);oneOf(terms.ownership,['owned','consigned'] as const);text(terms.returnRules,'Terma',6000);if(typeof terms.approved!=='boolean')fail('INVALID_INPUT');}
  }

  validate(packet: {
    products?: ProductOnboardingDraft[];
    locations?: LocationOnboardingDraft[];
    dealerTerms?: DealerTermsDraft;
    expectedSettingsVersion?: number;
  }): OnboardingValidationResult {
    this.assertPacket(packet);
    const missingFields: string[] = [];
    const warnings: string[] = [];
    const unknowns: string[] = [];
    const rejectedItems: { name: string; reason: string }[] = [];

    const products = packet.products ?? [];
    const hasApprovedSettings = packet.locations?.some(location => location.approved === true) === true || packet.dealerTerms?.approved === true;

    if (!products.length && !hasApprovedSettings) {
      missingFields.push('products');
      unknowns.push('Katalog produk belum dimuatkan.');
    }

    for (const p of products) {
      const name = p.name?.trim() ?? '';
      if (!name) {
        missingFields.push(`product[${p.sku ?? 'unknown'}].name`);
        rejectedItems.push({ name: p.sku ?? 'unnamed', reason: 'Nama produk diperlukan.' });
        continue;
      }

      // Check if artwork or mascot is erroneously treated as sellable SKU
      const lower = name.toLowerCase();
      if (p.isArtworkOrMascot || lower.includes('maskot') || lower.includes('mascot') || lower.includes('artwork')) {
        rejectedItems.push({
          name,
          reason: 'Artwork dan maskot jenama bukan SKU produk untuk jualan.',
        });
        continue;
      }

      // Pack size validation
      if (!p.packSize || p.packSize < 1) {
        rejectedItems.push({ name, reason: 'Saiz pek mestilah sekurang-kurangnya 1.' });
        continue;
      }

      // Unverified historical claims check
      if (p.priceSen === 2800 && !p.ownerApproved) {
        warnings.push(`Produk "${name}": Tuntutan harga historical RM28 belum disahkan oleh founder.`);
      }

      // Missing price checks
      if (p.priceSen === undefined || p.priceSen === null || p.priceSen <= 0) {
        missingFields.push(`product[${name}].priceSen`);
        if (p.lifecycle === 'published') {
          rejectedItems.push({
            name,
            reason: 'Produk tidak boleh diterbitkan tanpa harga sen yang diluluskan pemilik.',
          });
          continue;
        }
      }

      // Unapproved publish attempt
      if (p.lifecycle === 'published' && !p.ownerApproved) {
        rejectedItems.push({
          name,
          reason: 'Penerbitan katalog memerlukan kelulusan rasmi pemilik (ownerApproved: true).',
        });
        continue;
      }

      if (p.unverifiedFields && p.unverifiedFields.length > 0) {
        warnings.push(`Produk "${name}" mempunyai medan belum sah: ${p.unverifiedFields.join(', ')}.`);
      }
    }

    // Locations validation
    if (packet.locations) {
      for (const loc of packet.locations) {
        if (!loc.id || !loc.name) {
          missingFields.push('location.id_or_name');
        }
        if (loc.openingStockQuantity !== undefined && loc.openingStockQuantity < 0) {
          warnings.push(`Lokasi ${loc.name}: Opening stock tidak boleh negatif.`);
        }
      }
    }

    // Dealer terms validation
    if (packet.dealerTerms) {
      if (packet.dealerTerms.minimumQuantity < 1) {
        warnings.push('Terma pengedar: Kuantiti minimum mestilah sekurang-kurangnya 1.');
      }
      if (packet.dealerTerms.priceBasisPoints < 1 || packet.dealerTerms.priceBasisPoints > 10000) {
        warnings.push('Terma pengedar: Basis points diskaun mestilah antara 1 dan 10000.');
      }
    }

    const isValid = rejectedItems.length === 0 && missingFields.length === 0;
    const canCommit = rejectedItems.length === 0 && (products.some(p => p.ownerApproved && (p.priceSen ?? 0) > 0) || (products.length === 0 && hasApprovedSettings));

    return {
      isValid,
      canCommit,
      missingFields,
      warnings,
      unknowns,
      rejectedItems,
    };
  }

  commit(
    actor: Principal,
    packet: {
      products: ProductOnboardingDraft[];
      locations?: LocationOnboardingDraft[];
      dealerTerms?: DealerTermsDraft;
      expectedSettingsVersion?: number;
    },
  ): OnboardingCommitResult {
    this.auth.founder(actor);
    this.assertPacket(packet);
    return this.store.atomic(()=>{
    const receiptId=hash(JSON.stringify(canonicalPacket(packet)));
    const prior=this.store.get<OnboardingCommitResult&{id:string}>('onboarding_receipts',receiptId);
    if(prior){const {id:_id,...result}=prior;return result;}
    list(packet.products,500);
    const eligible=packet.products.filter(product=>product.ownerApproved&&!!product.priceSen);
    for(const product of eligible)if(product.sku&&this.store.get('catalogue','prod-'+product.sku.toLowerCase()))fail('PRODUCT_ALREADY_EXISTS',409,'SKU telah wujud. Gunakan suntingan katalog dengan revision semasa.');
    if(packet.locations?.some(location=>(location.openingStockQuantity??0)>0)&&eligible.length!==1)fail('OPENING_STOCK_PRODUCT_AMBIGUOUS',400,'Stok awal memerlukan tepat satu produk yang diluluskan.');
    const validation = this.validate(packet);
    if (!validation.canCommit) {
      fail('ONBOARDING_VALIDATION_FAILED', 400, 'Data onboarding tidak memenuhi syarat kelulusan.');
    }

    // Inventory must reference an explicitly approved location, never a draft label.
    const approvedLocationIds = new Set((this.store.get<BusinessSettings>('settings', 'business')?.approvedPolicies.locations ?? []).map(location => location.id));
    for (const location of packet.locations ?? []) if (location.approved === true) approvedLocationIds.add(location.id);
    if (packet.locations?.some(location => (location.openingStockQuantity ?? 0) > 0 && !approvedLocationIds.has(location.id))) {
      fail('OPENING_STOCK_LOCATION_UNAPPROVED', 400, 'Lokasi stok awal memerlukan kelulusan pemilik atau lokasi diluluskan yang sedia ada.');
    }

    let committedProductsCount = 0;
    let publishedProductsCount = 0;
    const approvedLocations=(packet.locations??[]).filter(location=>location.approved===true);
    const locationsCount=approvedLocations.length;
    const commitTime = now();

    if(approvedLocations.length||packet.dealerTerms?.approved){
      const previous=this.store.get<BusinessSettings>('settings','business')??{id:'business',version:0,approvedPolicies:{},locale:'ms-MY' as const,timezone:'Asia/Kuala_Lumpur' as const};
      this.store.revision(previous.version,packet.expectedSettingsVersion);
      const policies={...previous.approvedPolicies};
      if(approvedLocations.length){
        const locations=new Map((policies.locations??[]).map(location=>[location.id,location]));
        for(const draft of approvedLocations){const location={id:draft.id,name:draft.name.trim(),address:draft.address.trim(),hours:draft.hours!.trim(),verifiedAt:date(draft.verifiedAt)};locations.set(location.id,location);this.store.save('locations',location);}
        policies.locations=[...locations.values()];
      }
      if(packet.dealerTerms?.approved){const {approved:_approved,...terms}=packet.dealerTerms;policies.dealer={...terms,version:(policies.dealer?.version??0)+1,approvedAt:commitTime};}
      const settings:BusinessSettings={...previous,version:previous.version+1,approvedPolicies:policies};
      this.store.save('settings',settings);this.store.audit(actor.user.id,'settings.approve','business',settings.version);
    }
    let openingProductId:string|undefined;
    for (const p of packet.products) {
      if (!p.ownerApproved) continue;
      if (!p.priceSen || p.priceSen <= 0) continue;

      const shouldPublish = p.lifecycle === 'published';
      const version = this.commerce.version() + 1;
      const record: CatalogueProduct = {
        id: p.sku ? `prod-${p.sku.toLowerCase()}` : id(),
        name: p.name.trim(),
        description: p.description || 'Sambal Colek istimewa Abang Colek',
        priceSen: p.priceSen,
        packSize: p.packSize || 1,
        currency: 'MYR',
        publishedVersion: shouldPublish ? version : 0,
        availableQuantity: 0,
        revision: 1,
        status: shouldPublish ? 'published' : 'draft',
      };

      this.store.save('catalogue', record);
      openingProductId=record.id;
      this.store.setMetadata('catalogue_version', String(version));
      this.store.audit(actor.user.id, 'onboarding.product_commit', record.id, record.revision);

      committedProductsCount++;
      if (shouldPublish) publishedProductsCount++;
    }

    // Opening inventory reconciliation if specified
    if (packet.locations) {
      for (const loc of packet.locations) {
        if (loc.openingStockQuantity && loc.openingStockQuantity > 0) {
          const firstProduct = openingProductId?this.store.get<CatalogueProduct>('catalogue',openingProductId):null;
          if (firstProduct) {
            const lot: StockLot = {
              id: id(),
              productId: firstProduct.id,
              ownerId: 'business',
              locationId: loc.id,
              custodyId: 'hq',
              quantity: loc.openingStockQuantity,
              status: 'available',
              batchId: loc.batchId || `OB-${commitTime.slice(0, 10)}`,
              revision: 1,
            };
            this.store.save('lots', lot);
            const movement: InventoryMovement = {
              id: id(),
              productId: firstProduct.id,
              ownerId: 'business',
              locationId: loc.id,
              quantityDelta: loc.openingStockQuantity,
              operationKey: `onboarding.opening_stock.${lot.id}`,
              sourceEntityId: lot.id,
              createdAt: commitTime,
            };
            this.store.save('movements', movement);
          }
        }
      }
    }

    const result={
      committedProductsCount,
      publishedProductsCount,
      locationsCount,
      catalogueVersion: this.commerce.version(),
      committedAt: commitTime,
    };
    this.store.save('onboarding_receipts',{id:receiptId,...result});
    return result;
    });
  }
}
