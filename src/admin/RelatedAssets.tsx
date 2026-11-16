import {Link} from 'react-router-dom';
import {useApp,tr} from '../AppContext';
import {useAdminActions} from './AdminContext';
import {useText} from './ui';
import {optionText} from './copy';
import {DataTable} from './components';
import type {IndustrialAsset} from '../types';
export function RelatedAssets({parkId,saved}:{parkId:string;saved:boolean}){
 const a=useAdminActions(),{language}=useApp(),t=useText();
 const rows=a.store.drafts.filter(d=>d.kind==='asset'&&(d.data as IndustrialAsset).parkId===parkId);
 return <section className="related-assets"><div className="related-assets-heading"><div><h2>{t('Mặt bằng thuộc KCN','Properties in this park','园区物业')}</h2><p>{t('Thêm thông tin diện tích, giá thuê, hạ tầng và hình ảnh cho từng mặt bằng.','Add area, rent, infrastructure and images for each property.','为每处物业填写面积、租金、设施和图片。')}</p></div>{a.can('P02')&&(saved?<Link className="button primary" to={`/admin/assets/new?parkId=${encodeURIComponent(parkId)}`}>{t('Thêm mặt bằng','Add property','添加物业')}</Link>:<button disabled className="button primary">{t('Lưu KCN trước khi thêm mặt bằng','Save the park before adding a property','添加物业前请保存园区')}</button>)}</div>
 {rows.length?<div className="table-scroll"><DataTable><thead><tr><th>{t('Mặt bằng','Property','物业')}</th><th>{t('Loại','Type','类型')}</th><th>{t('Diện tích','Area','面积')}</th><th>{t('Trạng thái','Status','状态')}</th><th/></tr></thead><tbody>{rows.map(d=>{const asset=d.data as IndustrialAsset;return <tr key={d.id}><td><b>{tr(asset.name,language)||d.id}</b><small>{d.id}</small></td><td>{optionText(asset.type,language)}</td><td>{typeof asset.area==='number'&&Number.isFinite(asset.area)?`${asset.area.toLocaleString(language==='vi'?'vi-VN':language==='zh'?'zh-CN':'en-GB')} ${asset.unit}`:t('Chưa nhập','Not entered','未填写')}</td><td><span className="workflow-badge">{optionText(d.state,language)}</span></td><td><Link className="button" to={`/admin/assets/${d.id}/edit`}>{t('Biên tập','Edit','编辑')}</Link></td></tr>})}</tbody></DataTable></div>:<div className="related-empty">{t('KCN chưa có mặt bằng. Chọn “Thêm mặt bằng” để tạo hồ sơ đầu tiên.','This park has no properties yet. Choose “Add property” to create the first record.','此园区尚无物业。请选择“添加物业”创建首个档案。')}</div>}
 </section>;
}
