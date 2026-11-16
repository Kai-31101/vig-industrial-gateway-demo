// @vitest-environment node
import {describe,it,expect} from 'vitest';
import {catalogueSplit} from './catalogue';

const rec=(id:string,kind:'park'|'asset',state:string,live:boolean,parkId='p1')=>({id,kind,state,data:{id,name:{vi:id,en:id}},...(live?{published:kind==='park'?{id,publicationStatus:'published'}:{id,transaction:'lease',parkId}}:{})});

describe('manager AI catalogue split',()=>{
 it('separates published, draft-only and published-with-pending-edits records',()=>{
  const split=catalogueSplit([rec('p1','park','published',true),rec('p2','park','draft',true),rec('p3','park','draft',false),rec('a1','asset','in_review',false)]);
  expect(split.summary.parks).toMatchObject({total:3,published:2,draft:1,publishedWithPendingChanges:1});
  expect(split.summary.assets).toMatchObject({total:1,published:0,draft:1});
  expect(split.draftOnly.map(d=>d.id)).toEqual(['p3','a1']);
  expect([...split.pending]).toEqual(['p2']);
 });
 it('hides assets whose parent park is still a draft',()=>{
  const split=catalogueSplit([rec('p1','park','published',true),rec('p3','park','draft',false),rec('a1','asset','published',true,'p1'),rec('a3','asset','published',true,'p3')]);
  expect(split.summary.assets).toMatchObject({published:1,draft:1,hiddenByDraftPark:1});
 });
 it('never counts a withdrawn snapshot as published',()=>{
  const withdrawn={...rec('p9','park','draft',false),published:{id:'p9',publicationStatus:'withdrawn'}};
  expect(catalogueSplit([withdrawn]).summary.parks).toMatchObject({published:0,draft:1});
 });
});
