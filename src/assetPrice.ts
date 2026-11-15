import {pricingOf} from './contentSchema';
import type {IndustrialAsset,Language} from './types';
import {displaySourced} from './logic';
export function assetPriceText(asset:IndustrialAsset,language:Language){
 const text=(vi:string,en:string,zh:string)=>language==='vi'?vi:language==='zh'?zh:en;
 if(asset.pricing){const p=pricingOf(asset);if(p.mode==='negotiable')return text('Thỏa thuận','Negotiable','面议');if(p.mode==='not_available'||p.amount==null)return text('Chưa có thông tin','Not available','暂无信息');return `${p.amount.toLocaleString(language==='vi'?'vi-VN':language==='zh'?'zh-CN':'en-US')} ${p.currency}/${p.areaBasis}/${p.period==='month'?text('tháng','month','月'):p.period==='year'?text('năm','year','年'):text('kỳ thuê','lease term','租期')}`;}
 if(asset.price.disclosureStatus==='not_disclosed')return text('Không công bố','Not disclosed','不公开');
 if(asset.priceMode==='negotiable')return text('Thỏa thuận','Negotiable','面议');
 if(asset.priceMode==='not_available')return text('Chưa có thông tin','Not available','暂无信息');
 return displaySourced({...asset.price,unit:[asset.price.unit,asset.pricingBasis].filter(Boolean).join(' / ')},language);
}
