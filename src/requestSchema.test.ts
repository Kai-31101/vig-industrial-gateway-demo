import {describe,it,expect} from 'vitest';
import {validateLeasingRequest,maskContact} from './requestSchema';
const valid=()=>({kind:'find_supply',transaction:'lease',service:'Find Supply',organization:'QA Ltd',contactName:'Tester',email:'test@example.com',phone:'0900000000',assetType:'warehouse',location:'North',areaMin:1000,areaMax:2000,industry:'Not specified',requirements:'',budget:{mode:'specific',amount:100,currency:'USD',areaBasis:'m²',period:'month'},dateUnknown:true,availabilityDate:'',consent:true});
describe('Leasing intake validation',()=>{
 it('accepts complete leasing needs and an unspecified date',()=>expect(validateLeasingRequest(valid(),[],[])).toEqual({}));
 it('rejects missing consent and invalid contact details',()=>{const e=validateLeasingRequest({...valid(),consent:false,email:'invalid',phone:'123'});expect(Object.keys(e).sort()).toEqual(['consent','email','phone'])});
 it('rejects reversed area, invalid price dimension, past date and unavailable asset',()=>{const e=validateLeasingRequest({...valid(),areaMax:999,budget:{...valid().budget,areaBasis:'km²'},availabilityDate:'2020-01-01',assetId:'private'},[],[]);expect(Object.keys(e).sort()).toEqual(['areaMin','assetId','availabilityDate','budget'])});
 it('masks contact details before model requests',()=>{expect(maskContact('test@example.com +84 900 000 000')).not.toContain('example.com');expect(maskContact('test@example.com +84 900 000 000')).not.toContain('900')});
});
